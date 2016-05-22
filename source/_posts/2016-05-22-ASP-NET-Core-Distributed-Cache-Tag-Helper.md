---
layout: post
title: ASP.NET Core Distributed Cache Tag Helper
tags:
  - ASP.NET Core
  - Tag Helpers
  - MVC
categories:
  - ASP.NET Core
  - Tag Helpers
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2016/5/22/ASP-NET-Core-Distributed-Cache-Tag-Helper.aspx'
date: 2016-05-22 12:11:17
excerpt: The anxiously awaited ASP.NET Core RC2 has finally landed and with it we have a shiny new tag helper to explorer. In this post we will explore the new Distributed Cache tag helper and how it differs from the already existing Cache tag helper.
---

The anxiously awaited ASP.NET Core RC2 has finally landed and with it we have a shiny new tag helper to explorer.

We previously talked about the [Cache Tag Helper](http://www.davepaquette.com/archive/2015/06/03/mvc-6-cache-tag-helper.aspx) and how it allows you to cache the output from any section of a Razor page. While the Cache Tag Helper is powerful and very useful, it is limited in that it uses an instance of `IMemoryCache` which stores cache entries in memory in the local process. If the server process restarts for some reason, the contents of the cache will be post. Also, if your deployment consists of multiple servers, each server would have its own cache, each potentially containing different contents.

# Distributed Cache Tag Helper

The cache tag helper left people wanting more. Specifically they wanted to store the cached HTML in a distributed cache like Redis. Instead of complicating the existing Cache Tag Helper, the ASP.NET team enabled this use-case by adding a new [Distributed Cache Tag Helper](https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.TagHelpers/DistributedCacheTagHelper.cs).

Using the Distributed Cache Tag Helper is very similar to using the Cache Tag Helper:

{% codeblock lang:html %}
<distributed-cache name="MyCache">
    <p>Something that will be cached</p>
    @DateTime.Now.ToString()
</distributed-cache>
{% endcodeblock %}

The name property is required and the value should be unique. It is used as a prefix for the cache key. This differs from the Cache Tag Helper which uses an automatically generated unique id based on the location of the cache tag helper in your Razor page. The auto generated approach cannot be used with a distributed cache because Razor would generate different unique ids for each server. You will need to make sure that you use a unique `name` each time you use the `distributed-cache` tag helper. If you unintentionally use the same name in multiple places, you might get the same results in 2 places.

For example, see what happens when 2 `distributed-cache` tag helpers with the same `name`:

{% codeblock lang:html %}
<distributed-cache name="MyCache">
    <p>Something that will be cached</p>
    @DateTime.Now.ToString()
</distributed-cache>

<distributed-cache name="MyCache">
    <p>This should be different</p>
    @DateTime.Now.ToString()
</distributed-cache>
{% endcodeblock %}

![Accidental Cache Key Collision](http://www.davepaquette.com/images/distributed-cache-key-collision.png)

_If you are really curious about the how cache keys are generated for both tag helpers, take a look at the [CacheTagKey Class](https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.TagHelpers/Cache/CacheTagKey.cs)._

The `vary-by-*` and `expires-*` attributes all work the same as the Cache Tag Helper. You can review those in my [previous post](http://www.davepaquette.com/archive/2015/06/03/mvc-6-cache-tag-helper.aspx).

## Configuring the Distributed Cache

Unless you specify some additional configuration, the distributed cache tag helper actually uses a local process in memory cache. This might seem a little strange but it does help with the developer workflow. As a developer, I don't need to worry about standing up a distributed cache like Redis just to run the app locally. The intention of course is that a true distributed cache would be used in a staging/production environments.

The simplest approach to configuring the distributed cache tag helper is to configure a `IDistributedCache` service in the Startup class. ASP.NET Core ships with 2 distributed cache implementations out of the box: [SqlServer](https://github.com/aspnet/Caching/blob/dev/src/Microsoft.Extensions.Caching.SqlServer/SqlServerCache.cs) and [Redis](https://github.com/aspnet/Caching/blob/dev/src/Microsoft.Extensions.Caching.Redis/RedisCache.cs).

As a simple test, let's try specifying a `SqlServerCache` in the `Startup.ConfigureServices` method:

{% codeblock lang:csharp %}
services.AddSingleton<IDistributedCache>(serviceProvider =>
    new SqlServerCache(new SqlServerCacheOptions()
    {
        ConnectionString = @"Data Source=(localdb)\MSSQLLocalDB;Initial Catalog=DistributedCacheTest;Integrated Security=True;",
        SchemaName = "dbo",
        TableName = "MyAppCache"
    }));
{% endcodeblock %}

Of course, the ConnectionString should be stored in a configuration file but for demonstration purposes I have in-lined it here.

You will need to create the database and table manually. Here is a script for creating the table, which I extracted from [here](https://github.com/aspnet/Caching/blob/dev/src/Microsoft.Extensions.Caching.SqlConfig.Tools/SqlQueries.cs):

{% codeblock lang:sql %}
CREATE TABLE MyAppCache(            
	Id nvarchar(449) COLLATE SQL_Latin1_General_CP1_CS_AS NOT NULL, 
	Value varbinary(MAX) NOT NULL,
	ExpiresAtTime datetimeoffset NOT NULL, 
	SlidingExpirationInSeconds bigint NULL,
	AbsoluteExpiration datetimeoffset NULL,
	CONSTRAINT pk_Id PRIMARY KEY (Id))

CREATE NONCLUSTERED INDEX Index_ExpiresAtTime ON MyAppCache(ExpiresAtTime)
{% endcodeblock %}

Now when I visit the page that contains the `distributed-cache` tag helper, I get the following error:

`InvalidOperationException: Either absolute or sliding expiration needs to be provided.`

The SQL Server implementation requires us to specify some form of expiry. No problem, let's just add the those attributes to the tag helper:

{% codeblock lang:html %}
<distributed-cache name="MyCacheItem1" expires-after="TimeSpan.FromHours(1)">
    <p>Something that will be cached</p>
    @DateTime.Now.ToString()
</distributed-cache>


<distributed-cache name="MyCacheItem2" expires-sliding="TimeSpan.FromMinutes(30)">
    <p>This should be different</p>
    @DateTime.Now.ToString()
</distributed-cache>
{% endcodeblock %} 

Now the page renders properly and we can see the contents in SQL Server:

![SQL Server Cache Contents](http://www.davepaquette.com/images/sql-server-cache-contents.png)

Note that since the key is hashed and the value is stored in binary, the contents of the table in SQL server are not human readable.

For more details on working with a SQL Server or Redis distrubted cache, see the [official ASP.NET Docs](https://docs.asp.net/en/latest/performance/caching/distributed.html);

## Even more configuration
 
 In some cases, you might want more control over how values are serialized or even how the distributed cache is used by the tag helper. In those cases, you could implement your own [IDistributedCacheTagHelperFormatter](https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.TagHelpers/Cache/IDistributedCacheTagHelperFormatter.cs) and/or [IDistributedCacheTagHelperStorage](https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.TagHelpers/Cache/IDistributedCacheTagHelperStorage.cs).
 
 In cases where you need complete control, you could implement your own [IDistributedCacheTagHelperService](https://github.com/aspnet/Mvc/blob/dev/src/Microsoft.AspNetCore.Mvc.TagHelpers/Cache/IDistributedCacheTagHelperService.cs).
 
 I suspect that this added level of customization won't be needed by most people.
 
 # Conclusion
 
 The Distributed Cache Tag Helper provides an easy path to caching HTML fragments in a distributed cache. Out of the box, Redis and SQL Server are supported. Over time, I expect that a number of alternative distributed cache implementations will be provided by the community. 








