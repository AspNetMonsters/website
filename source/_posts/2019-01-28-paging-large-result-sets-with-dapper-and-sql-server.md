---
layout: post
title: Paging Large Result Sets with Dapper and SQL Server
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
categories:
  - Development
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2019/01/28/paging-large-result-sets-with-dapper-and-sql-server.aspx'
date: 2019-01-28 20:15:42
excerpt: This is a part of a series of blog posts on data access with Dapper. In today's post, we look at a way to page through large results sets.
---
This is a part of a series of blog posts on data access with Dapper. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).
  
In today's post, we explore paging through large result sets. Paging is a common technique that is used when dealing with large results sets. Typically, it is not useful for an application to request millions of records at a time because there is no efficient way to deal with all those records in memory all at once. This is especially true when rendering data on a grid in a user interface. The screen can only display a limited number of records at a time so it is generally a bad use of system resources to hold everything in memory when only a small subset of those records can be displayed at any given time.

![Paged Table](https://www.davepaquette.com/images/dapper/paged_table_example.png)
_Source: [AppStack Bootstrap Template](https://themes.getbootstrap.com/product/appstack-responsive-admin-template/)_

Modern versions of SQL Server support the [OFFSET / FETCH clause](https://docs.microsoft.com//sql/t-sql/queries/select-order-by-clause-transact-sql#using-offset-and-fetch-to-limit-the-rows-returned) to implement query paging.

In continuing with our airline theme, consider a `Flight` entity. A `Flight` represents a particular occurrence of a `ScheduledFlight` on a particular day. That is, it has a reference to the `ScheduledFlight` along with some properties indicating the scheduled arrival and departure times. 


{% codeblock lang:csharp %}
public class Flight 
{
    public int Id {get; set;}
    public int ScheduledFlightId {get; set;}
    public ScheduledFlight ScheduledFlight { get; set;}
    public DateTime Day {get; set;}
    public DateTime ScheduledDeparture {get; set;}
    public DateTime ScheduledArrival {get; set;}
}
{% endcodeblock %}

{% codeblock lang:csharp %}
public class ScheduledFlight 
{
    public int Id {get; set;}
    public string FlightNumber {get; set;}

    public int DepartureAirportId {get; set;}
    public Airport DepartureAirport {get; set;}
    public int DepartureHour {get; set;}
    public int DepartureMinute {get; set;}

    public int ArrivalAirportId {get; set;}
    public Airport ArrivalAirport {get; set;}        
    public int ArrivalHour {get; set;}
    public int ArrivalMinute {get; set;}

    public bool IsSundayFlight {get; set;}
    public bool IsMondayFlight {get; set;}
    // Some other properties
}
{% endcodeblock %}

## Writing the query
As we learned in a [previous post](https://www.davepaquette.com/archive/2018/02/07/loading-related-entities-many-to-one.aspx), we can load the `Flight` entity along with it's related `ScheduledFlight` entity using a technique called multi-mapping. 

In this case, loading all the flights to or from a particular airport, we would use the following query.

{% codeblock lang:sql %}
SELECT f.*, sf.*
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
{% endcodeblock %}

But this query could yield more results than we want to deal with at any given time. Using OFFSET/FETCH, we can ask for only a block of results at a time.

{% codeblock lang:sql %}
SELECT f.*, sf.*
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
ORDER BY f.Day, sf.FlightNumber
OFFSET @Offset ROWS
FETCH NEXT @PageSize ROWS ONLY
{% endcodeblock %}

Note that an ORDER BY clause is required when using OFFSET/FETCH. 

## Executing the Query

{% codeblock lang:csharp %}
//GET api/flights
[HttpGet]
public async Task<IEnumerable<Flight>> Get(string airportCode, int page=1, int pageSize=10)
{
    IEnumerable<Flight> results;

    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var query = @"
SELECT f.*, sf.*
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
ORDER BY f.Day, sf.FlightNumber
OFFSET @Offset ROWS
FETCH NEXT @PageSize ROWS ONLY;
";

        results = await connection.QueryAsync<Flight, ScheduledFlight, Flight>(query,
          (f, sf) =>
              {
                  f.ScheduledFlight = sf;
                  return f;
              },
            new { AirportCode = airportCode,
                              Offset = (page - 1) * pageSize,
                              PageSize = pageSize }
            );        
    }

    return results;
}
{% endcodeblock %}

Here we calculate the offset by based on the `page` and `pageSize` arguments that were passed in. This allows the caller of the API to request a particular number of rows and the starting point.

## One step further
When dealing with paged result sets, it can be useful for the caller of the API to also know the total number of records. Without the total number of records, it would be difficult to know how many records are remaining which in turn makes it difficult to render a paging control, a progress bar or a scroll bar (depending on the use case).

A technique I like to use here is to have my API return a `PagedResults<T>` class that contains the list of items for the current page along with the total count.

{% codeblock lang:csharp %}
public class PagedResults<T>
{
    public IEnumerable<T> Items { get; set; }
    public int TotalCount { get; set; }
}
{% endcodeblock %}

To populate this using Dapper, we can add a second result set to the query. That second result set will simply be a count of all the records. Note that the same WHERE clause is used in both queries.

{% codeblock lang:sql %}
SELECT f.*, sf.*
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
ORDER BY f.Day, sf.FlightNumber
OFFSET @Offset ROWS
FETCH NEXT @PageSize ROWS ONLY;

SELECT COUNT(*)
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
{% endcodeblock %}

Now in our code that executes the query, we will the `QueryMultipleAsync` method to execute both SQL statements in a single round trip. 

{% codeblock lang:csharp %}
//GET api/flights
[HttpGet]
public async Task<PagedResults<Flight>> Get(string airportCode, int page=1, int pageSize=10)
{
    var results = new PagedResults<Flight>();

    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var query = @"
SELECT f.*, sf.*
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
ORDER BY f.Day, sf.FlightNumber
OFFSET @Offset ROWS
FETCH NEXT @PageSize ROWS ONLY;

SELECT COUNT(*)
FROM Flight f
INNER JOIN ScheduledFlight sf ON f.ScheduledFlightId = sf.Id
INNER JOIN Airport a ON sf.ArrivalAirportId = a.Id
INNER JOIN Airport d ON sf.DepartureAirportId = d.Id
WHERE a.Code = @AirportCode OR d.Code = @AirportCode
";

        using (var multi = await connection.QueryMultipleAsync(query,
                    new { AirportCode = airportCode,
                          Offset = (page - 1) * pageSize,
                          PageSize = pageSize }))
        {
            results.Items = multi.Read<Flight, ScheduledFlight, Flight>((f, sf) =>
                {
                    f.ScheduledFlight = sf;
                    return f;
                }).ToList();

            results.TotalCount = multi.ReadFirst<int>();
        }
    }

    return results;
}
    
{% endcodeblock %}

## Wrapping it up
Paged result sets is an important technique when dealing with large amounts of data. When using a full ORM like Entity Framework, this is implemented easily using LINQ's  `Skip` and `Take` methods. It's so easy in fact that it can look a little like magic. In reality, it is actually very simple to write your own queries to support paged result sets and execute those queries using Dapper. 