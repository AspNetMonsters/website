title: JSON Configuration in ASP.NET Core MVC
layout: post
tags:
  - "ASP.NET Core"
  - "ASP.NET 5"
categories:
  - Code Dive
authorId: james_chambers
date: 2016-01-21 21:36:09
originalurl: http://jameschambers.com/2016/01/json-config-in-aspnetcoremvc/
---

Structured data in earlier versions of ASP.NET meant creating and registering custom types and configuration sections for our applications. In ASP.NET Core and in Core MVC, structured configuration is a breeze with support for JSON documents as the storage mechanism and the ability to flatten hierarchies into highly portable keys.

![Structured JSON Configuration](https://jcblogimages.blob.core.windows.net:443/img/2016/01/json-structured-data.png)

<!-- more -->

You can see from the document snippet above, taken from the default project template, that we can easily achieve a well-structured, human-readible set of data.  Where we used to do something the the following:

````
  <appSettings>
    <add key="Logging-IncludeScopes" value="false" />
    <add key="Logging-Level-Default" value="verbose" />
    <add key="Logging-Level-System" value="Information" />
    <add key="Logging-Level-Microsoft" value="Information" />
  </appSettings>
````

Our other option, of course, is going the custom object route, but that has always been a pain in the rear. Today we can do this:

````
  "Logging": {
    "IncludeScopes": false,
    "LogLevel": {
      "Default": "Verbose",
      "System": "Information",
      "Microsoft": "Information"
    }
  }
````

Now the data that we have related to logging can be grouped into a logical fragment of the configuration file and can grow as required. 

## Exploring a Common Example

This organization is great and comes along with the benefit of being collapsable into a key-value pair.  We see evidence of this in the connection string, which is also located in the `appsettings.json` file:

````
  "Data": {
    "DefaultConnection": {
      "ConnectionString": "Server=(localdb)\\mssqllocaldb;Database=aspnet5-ConfigurationSample-ad90971f-6620-4bc1-ad28-650c59478cc1;Trusted_Connection=True;MultipleActiveResultSets=true"
    }
  }
````

And when you want to pull it out of the stored configuration, you do so like this example from `startup.cs`:

````
    services.AddEntityFramework()
        .AddSqlServer()
        .AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(Configuration["Data:DefaultConnection:ConnectionString"]));

````

Notice how the value of the `ConnectionString` property of the `DefaultConnection` object within the `Data` object at the root was stored as the key `Data:DefaultConnection:ConnectionString`. This is perfect for allowing overrides, such as using environment variables. This is further made handy by the fact that your settings in Azure are automatically loaded as environment variables into your application execution process at startup.

In your Azure Web App configuration, you would simply need to add a key named `Data:DefaultConnection:ConnectionString` and set the value accordingly. This means that developers can use LocalDB locally, and the app automatically lights up in the cloud with the real database.

## Next Up

These key-value pairs are great, but in your application it would be a bother to have to load out each property by hand. In my next post I'm going to show you how to take a configuration section and turn it into a set of typed configuration options that can be used throughout your project. 

Happy coding!
