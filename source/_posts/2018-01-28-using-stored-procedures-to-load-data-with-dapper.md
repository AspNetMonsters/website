---
layout: post
title: Using Stored Procedures to Load Data with Dapper
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
categories:
  - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2018/01/28/using-stored-procedures-to-load-data-with-dapper.aspx'
date: 2018-01-28 20:00:01
excerpt: Let's just get this one out of the way early. Stored procedures are not my favorite way to get data from SQL Server but there was a time when they were extremely popular. They are still heavily used today and so this series would not be complete without covering how to use stored procedures with Dapper. 
---
This is a part of a series of blog posts on data access with Dapper. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).
 
Let's just get this one out of the way early. Stored procedures are not my favorite way to get data from SQL Server but there was a time when they were extremely popular. They are still heavily used today and so this series would not be complete without covering how to use stored procedures with Dapper. 

## A Simple Example
Let's imagine a simple stored procedure that allows us to query for `Aircraft` by model.

{% codeblock lang:sql %}
CREATE PROCEDURE GetAircraftByModel @Model NVARCHAR(255) AS
BEGIN
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
    FROM Aircraft a
    WHERE a.Model = @Model
END
{% endcodeblock %}

To execute this stored procedure and map the results to a collection of `Aircraft` objects, use the `QueryAsync` method almost exactly like we did in the [last post](https://www.davepaquette.com/archive/2018/01/22/loading-an-object-graph-with-dapper.aspx). 

{% codeblock lang:csharp %}
//GET api/aircraft
[HttpGet]
public async Task<IEnumerable<Aircraft>> Get(string model)
{
    IEnumerable<Aircraft> aircraft;

    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();

        aircraft = await connection.QueryAsync<Aircraft>("GetAircraftByModel",
                        new {Model = model}, 
                        commandType: CommandType.StoredProcedure);
    }
    return aircraft;
}
{% endcodeblock %}

Instead of passing in the raw SQL statement, we simply pass in the name of the stored procedure. We also pass in an object that has properties for each of the stored procedures arguments, in this case `new {Model = model}` maps the `model` variable to the stored procedure's `@Model` argument. Finally, we specify the `commandType` as `CommandType.StoredProcedure`. 

## Wrapping it up

That's all there is to using stored procedures with Dapper. As much as I dislike using stored procedures in my applications, I often do have to call stored procedures to fetch data from legacy databases. When that situation comes up, Dapper is my tool of choice. 

Stay tuned for the next installment in this Dapper series. Comment below if there is a specific topic you would like covered.
