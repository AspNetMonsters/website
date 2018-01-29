---
layout: post
title: Loading an Object From SQL Server Using Dapper
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
categories:
  - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2018/01/22/loading-an-object-graph-with-dapper.aspx'
date: 2018-01-22 21:30:00
excerpt: I was recently asked to create a read-only web API to expose some parts of a system's data model to third party developers. While Entity Framework is often my go-to tool for data access, I thought this was a good scenario to use Dapper instead. This series of blog posts explores dapper and how you might use it in your application. Today, we will start with the basics of loading and mapping a database table to a C# class. 
---
I was recently asked to create a read-only web API to expose some parts of a system's data model to third party developers. While [Entity Framework](https://docs.microsoft.com/en-us/ef/) is often my go-to tool for data access, I thought this was a good scenario to use Dapper instead. This series of blog posts explores dapper and how you might use it in your application. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).
 
 Today, we will start with the basics of loading a mapping and database table to a C# class. 

# What is Dapper?
[Dapper](https://github.com/StackExchange/Dapper) calls itself a simple object mapper for .NET and is usually lumped into the category of micro ORM (Object Relational Mapper). When compared to a fully featured ORM like Entity Framework, Dapper lacks certain features like change-tracking, lazy loading and the ability to translate complex LINQ expressions to SQL queries. The fact that Dapper is missing these features is probably the single best thing about Dapper. While it might seem like you're giving up a lot, you are also gaining a lot by dropping those types of features. Dapper is fast since it doesn't do a lot of the magic that Entity Framework does under the covers. Since there is less magic, Dapper is also a lot easier to understand which can lead to lower maintenance costs and maybe even fewer bugs. 

# How does it work?
Throughout this series we will build on an example domain for an airline. All airlines need to manage a fleet of aircraft, so let's start there. Imagine a database with a table named `Aircraft` and a C# class with property names that match the column names of the `Aircraft` table.

{% codeblock lang:sql %}
CREATE TABLE Aircraft
    (
        Id int not null IDENTITY(1,1) CONSTRAINT pk_Aircraft_Id PRIMARY KEY,
        Manufacturer nvarchar(255),
        Model nvarchar(255),
        RegistrationNumber nvarchar(50),
        FirstClassCapacity int,
        RegularClassCapacity int,
        CrewCapacity int,
        ManufactureDate date,
        NumberOfEngines int,
        EmptyWeight int,
        MaxTakeoffWeight int
    )
{% endcodeblock %}


{% codeblock lang:csharp %}
public class Aircraft 
{
    public int Id { get; set; }
    public string Manufacturer {get; set;}
    public string Model {get; set;}
    public string RegistrationNumber {get; set;}
    public int FirstClassCapacity {get; set;}
    public int RegularClassCapacity {get; set;}
    public int CrewCapacity {get; set;}
    public DateTime ManufactureDate {get; set; }
    public int NumberOfEngines {get; set;}
    public int EmptyWeight {get; set;}
    public int MaxTakeoffWeight {get; set;}
}
{% endcodeblock %}

## Installing Dapper
Dapper is available as a [Nuget package](https://www.nuget.org/packages/Dapper/). To use Dapper, all you need to do is add the `Dapper` package to your project.

 **.NET Core CLI**: `dotnet add package Dapper`

**Package Manager Console**: `Install-Package Dapper`

## Querying a single object
Dapper provides a set of extension methods for .NET's `IDbConnection` interface. For our first task, we want to execute a query to return the data for a single row from the `Aircraft` table and place the results in an instance of the `Aircraft` class. This is easily accomplished using Dapper's `QuerySingleAsync` method.

{% codeblock lang:csharp %}
[HttpGet("{id}")]
public async Task<Aircraft> Get(int id)
{
  Aircraft aircraft;
  using (var connection = new SqlConnection(_connectionString))
  {
    await connection.OpenAsync();
    var query = @"
SELECT 
       Id
      ,Manufacturer
      ,Model
      ,RegistrationNumber
      ,FirstClassCapacity
      ,RegularClassCapacity
      ,CrewCapacity
      ,ManufactureDate
      ,NumberOfEngines
      ,EmptyWeight
      ,MaxTakeoffWeight
  FROM Aircraft WHERE Id = @Id";

    aircraft = await connection.QuerySingleAsync<Aircraft>(query, new {Id = id});
  }
  return aircraft;
}
{% endcodeblock %} 

Before we can call Dapper's `QuerySingleASync` method, we need an instance of an open `SqlConnection`. If you are an Entity Framework user, you might not be used to working directly with the `SqlConnection` class because Entity Framework generally manages connections for you. All we need to do is create a new `SqlConnection`, passing in the connection string, then call `OpenAsync` to open that connection. We wrap the connection in a `using` statement to ensure that `connection.Dispose()` is called when we are done with the connection. This is important because it ensures the connection is returned to the connection pool that is managed by .NET. If you forget to do this, you will quickly run into problems where your application is not able to connect to the database because the connection pool is starved. Check out the [.NET Docs](https://docs.microsoft.com/en-us/dotnet/framework/data/adonet/sql-server-connection-pooling) for  more information on connection pooling.

We will use the following pattern throughout this series of blogs posts:

{% codeblock lang:csharp %}
using(var connection = new SqlConnection(_connectionString))
{
  await connection.OpenAsync();
  //Do Dapper Things
}
{% endcodeblock %}

As @Disman pointed out in the comments, it is not necessary to call `connection.OpenAsync()`. If the connection is not already opened, Dapper will call `OpenAsync` for you. Call me old fashioned but I think that whoever created the connection should be the one responsible for opening it, that's why I like to open the connection before calling Dapper.

Let's get back to our example. To query for a single `Aircraft`, we call the `QuerySingleAsync` method, specifying the `Aircraft` type parameter. The type parameter tells Dapper what class type to return. Dapper will take the results of the query that gets executed and map the column values to properties of the specified type. We also pass in two arguments. The first is the query that will return a single row based on a specified `@Id` parameter.

{% codeblock lang:csharp %}
SELECT 
       Id
      ,Manufacturer
      ,Model
      ,RegistrationNumber
      ,FirstClassCapacity
      ,RegularClassCapacity
      ,CrewCapacity
      ,ManufactureDate
      ,NumberOfEngines
      ,EmptyWeight
      ,MaxTakeoffWeight
  FROM Aircraft WHERE Id = @Id
{% endcodeblock %} 

The next parameter is an anonymous class containing properties that will map to the parameters of the query. 

{% codeblock lang:csharp %}
 new {Id = id}
{% endcodeblock %}

Passing the parameters in this way ensures that our queries are not susceptible to SQL injection attacks.

That's really all there is to it. As long as the column names and data types match the property of your class, Dapper takes care of executing the query, creating an instance of the `Aircraft` class and setting all the properties.

If the query doesn't contain return any results, Dapper will throw an `InvalidOperationException`.

> InvalidOperationException: Sequence contains no elements

If you prefer that Dapper returns null when there are no results, use the `QuerySingleOrDefaultAsnyc` method instead.

## Querying a list of objects

Querying for a list of objects is just as easy as querying for a single object. Simply call the `QueryAsync` method as follows.

{% codeblock lang:csharp %}
[HttpGet]
public async Task<IEnumerable<Aircraft>> Get()
{
  IEnumerable<Aircraft> aircraft;

  using (var connection = new SqlConnection(_connectionString))
  {
    await connection.OpenAsync();
    var query = @"
SELECT 
       Id
      ,Manufacturer
      ,Model
      ,RegistrationNumber
      ,FirstClassCapacity
      ,RegularClassCapacity
      ,CrewCapacity
      ,ManufactureDate
      ,NumberOfEngines
      ,EmptyWeight
      ,MaxTakeoffWeight
  FROM Aircraft";
    aircraft = await connection.QueryAsync<Aircraft>(query);
    }
  return aircraft;
}
{% endcodeblock %}

In this case, the query did not contain any parameters. If it did, we would pass those parameters in as an argument to the `QueryAsync` method just like we did for the `QuerySingleAsync` method.

## What's next?
This is just the beginning of what I expect will be a long series of blog posts. You can follow along on this blog and you can track the [sample code on GitHub](https://github.com/AspNetMonsters/DapperSeries). 

Leave a comment below if there is a topic you would like me to cover. 