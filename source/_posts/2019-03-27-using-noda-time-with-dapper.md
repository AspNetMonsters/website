---
layout: post
title: Using NodaTime with Dapper
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
  - Noda Time
categories:
 - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2019/03/27/using-noda-time-with-dapper.aspx'
date: 2019-03-27 20:00:00
excerpt: After my recent misadventures attempting to use Noda Time with Entity Framework Core, I decided to see what it would take to use Dapper in a the same scenario.
---
This is a part of a series of blog posts on data access with Dapper. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).

After my recent misadventures attempting to use Noda Time with [Entity Framework Core](https://www.davepaquette.com/archive/2019/03/26/using-noda-time-with-ef-core.aspx), I decided to see what it would take to use Dapper in a the same scenario.

## A quick recap
In my app, I needed to model an `Event` that occurs on a particular date. It might be initially tempting to store the date of the event as a DateTime in UTC, but that's not necessarily accurate unless the event happens to be held at the Royal Observatory Greenwich. I don't want to deal with time at all, I'm only interested in the date the event is being held. 

NodaTime provides a `LocalDate` type that is perfect for this scenario so I declared a `LocalDate` property named `Date` on my `Event` class.

{% codeblock lang:csharp %}
public class Event
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public LocalDate Date {get; set;}
}
{% endcodeblock %}

## Querying using Dapper

I modified my app to query for the `Event` entities using Dapper:

{% codeblock lang:csharp %}
var queryDate = new LocalDate(2019, 3, 26);
using (var connection = new SqlConnection(myConnectionString))
{
    await connection.OpenAsync();
    Events = await connection.QueryAsync<Event>(@"SELECT [e].[Id], [e].[Date], [e].[Description], [e].[Name]
FROM [Events] AS[e]");
}
{% endcodeblock %}

The app started up just fine, but gave me an error when I tried to query for events.

> System.Data.DataException: Error parsing column 1 (Date=3/26/19 12:00:00 AM - DateTime) ---> System.InvalidCastException: Invalid cast from 'System.DateTime' to 'NodaTime.LocalDate'.

Likewise, if I attempted to query for events using a `LocalDate` parameter, I got another error:

{% codeblock lang:csharp %}
var queryDate = new LocalDate(2019, 3, 26);
using (var connection = new SqlConnection("myConnectionString"))
{
    await connection.OpenAsync();

    Events = await connection.QueryAsync<Event>(@"SELECT [e].[Id], [e].[Date], [e].[Description], [e].[Name]
FROM [Events] AS[e]
WHERE [e].[Date] = @Date", new { Date = queryDate });
}
{% endcodeblock %}

> NotSupportedException: The member Date of type NodaTime.LocalDate cannot be used as a parameter value

Fortunately, both these problems can be solved by implementing a simple `TypeHandler`.

## Implementing a Custom Type Handler

Out of the box, Dapper already knows how to map to the standard .NET types like Int32, Int64, string and DateTime. The problem we are running into here is that Dapper doesn't know anything about the `LocalDate` type. If you want to map to a type that Dapper doesn't know about, you can implement a custom type handler. To implement a type handler, create a class that inherits from `TypeHandler<T>`, where `T` is the type that you want to map to. In your type handler class, implement the `Parse` and `SetValue` methods. These methods will be used by Dapper when mapping to and from properties that are of type `T`. 

Here is an example of a type handler for `LocalDate`.

{% codeblock lang:csharp %}
public class LocalDateTypeHandler : TypeHandler<LocalDate>
{
    public override LocalDate Parse(object value)
    {
        if (value is DateTime)
        {
            return LocalDate.FromDateTime((DateTime)value);
        }

        throw new DataException($"Unable to convert {value} to LocalDate");
    }

    public override void SetValue(IDbDataParameter parameter, LocalDate value)
    {
        parameter.Value = value.ToDateTimeUnspecified();
    }
}
{% endcodeblock %}

Finally, you need to tell Dapper about your new custom type handler. To do that, register the type handler somewhere in your application's startup class by calling `Dapper.SqlMapper.AddTypeHandler`.

{% codeblock lang:csharp %}
Dapper.SqlMapper.AddTypeHandler(new LocalDateTypeHandler());
{% endcodeblock %}

## There's a NuGet for that

As it turns out, someone has already created a helpful NuGet package containing TypeHandlers for many of the NodaTime types so you probably don't need to write these yourself. Use the [Dapper.NodaTime package](http://mj1856.github.io/Dapper-NodaTime/) instead.

## Wrapping it up
TypeHandlers are a simple extension point that allows for Dapper to handle types that are not already handled by Dapper. You can write your own type handlers but you might also want to check if someone has already published a NuGet package that handles your types. 