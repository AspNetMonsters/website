---
layout: post
title: Managing Database Transactions in Dapper
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
categories:
 - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2019/02/06/managing-transactions-in-dapper.aspx'
date: 2019-02-06 7:00:00
excerpt: This is a part of a series of blog posts on data access with Dapper. In today's post, we explore a more complex write operation that requires us to manage a database transaction.
---
This is a part of a series of blog posts on data access with Dapper. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).
  
In today's post, we explore a more complex scenario that involves executing multiple _write_ operations. In order to ensure consistency at the database level, these operations should all succeed / fail together as a single transaction. In this example, we will be inserting a new `ScheduledFlight` entity along with an associated set of `Flight` entities.

 As a quick reminder, a `Flight` represents a particular occurrence of a `ScheduledFlight` on a particular day. That is, it has a reference to the `ScheduledFlight` along with some properties indicating the scheduled arrival and departure times. 


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

## Inserting the ScheduledFlight
Inserting the `ScheduledFlight` and retrieving the database generated id is easy enough. We can use the same approach we used in the [previous blog post](https://www.davepaquette.com/archive/2019/02/04/basic-insert-update-delete-with-dapper.aspx).

{% codeblock lang:csharp %}
// POST api/scheduledflight
[HttpPost()]
public async Task<IActionResult> Post([FromBody] ScheduledFlight model)
{
    int newScheduledFlightId;
    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var insertScheduledFlightSql = @"
INSERT INTO [dbo].[ScheduledFlight]
    ([FlightNumber]
    ,[DepartureAirportId]
    ,[DepartureHour]
    ,[DepartureMinute]
    ,[ArrivalAirportId]
    ,[ArrivalHour]
    ,[ArrivalMinute]
    ,[IsSundayFlight]
    ,[IsMondayFlight]
    ,[IsTuesdayFlight]
    ,[IsWednesdayFlight]
    ,[IsThursdayFlight]
    ,[IsFridayFlight]
    ,[IsSaturdayFlight])
VALUES
    (@FlightNumber
    ,@DepartureAirportId
    ,@DepartureHour
    ,@DepartureMinute
    ,@ArrivalAirportId
    ,@ArrivalHour
    ,@ArrivalMinute
    ,@IsSundayFlight
    ,@IsMondayFlight
    ,@IsTuesdayFlight
    ,@IsWednesdayFlight
    ,@IsThursdayFlight
    ,@IsFridayFlight
    ,@IsSaturdayFlight);
SELECT CAST(SCOPE_IDENTITY() as int)";
        newScheduledFlightId = await connection.ExecuteScalarAsync<int>(insertScheduledFlightSql, model);
    }
    return Ok(newScheduledFlightId);
}

{% endcodeblock %}

According to the bosses at Air Paquette, whenever we create a new `ScheduledFlight` entity, we also want to generate the `Flight` entities for the next 12 months of that `ScheduledFlight`. We can add a method to the `ScheduledFlight` class to generate the flight entities.

**NOTE:** Let's just ignore the obvious bugs related to timezones and to flights that take off and land on a different day.

{% codeblock lang:csharp %}
public IEnumerable<Flight> GenerateFlights(DateTime startDate, DateTime endDate)
{
    var flights = new List<Flight>();
    var currentDate = startDate;

    while (currentDate <= endDate)
    {
        if (IsOnDayOfWeek(currentDate.DayOfWeek))
        {
            var departureTime = new DateTime(currentDate.Year, currentDate.Month, currentDate.Day, DepartureHour, DepartureMinute, 0);
            var arrivalTime = new DateTime(currentDate.Year, currentDate.Month, currentDate.Day, ArrivalHour, ArrivalMinute, 0);
            var flight = new Flight
            {
                ScheduledFlightId = Id,
                ScheduledDeparture = departureTime,
                ScheduledArrival = arrivalTime,
                Day = currentDate.Date
            };
            flights.Add(flight);
        }
        currentDate = currentDate.AddDays(1);
    }
    return flights;
}
public bool IsOnDayOfWeek(DayOfWeek dayOfWeek)
{
    return     (dayOfWeek == DayOfWeek.Sunday && IsSundayFlight)
            || (dayOfWeek == DayOfWeek.Monday && IsMondayFlight)
            || (dayOfWeek == DayOfWeek.Tuesday && IsTuesdayFlight)
            || (dayOfWeek == DayOfWeek.Wednesday && IsWednesdayFlight)
            || (dayOfWeek == DayOfWeek.Thursday && IsThursdayFlight)
            || (dayOfWeek == DayOfWeek.Friday && IsFridayFlight)
            || (dayOfWeek == DayOfWeek.Saturday && IsSaturdayFlight);
}
{% endcodeblock %}

Now in the controller, we can add some logic to call the `GenerateFlight` method and then insert those `Flight` entities using Dapper.

{% codeblock lang:csharp %}
// POST api/scheduledflight
[HttpPost()]
public async Task<IActionResult> Post([FromBody] ScheduledFlight model)
{
    int newScheduledFlightId;
    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var insertScheduledFlightSql = @"
INSERT INTO [dbo].[ScheduledFlight]
    ([FlightNumber]
    ,[DepartureAirportId]
    ,[DepartureHour]
    ,[DepartureMinute]
    ,[ArrivalAirportId]
    ,[ArrivalHour]
    ,[ArrivalMinute]
    ,[IsSundayFlight]
    ,[IsMondayFlight]
    ,[IsTuesdayFlight]
    ,[IsWednesdayFlight]
    ,[IsThursdayFlight]
    ,[IsFridayFlight]
    ,[IsSaturdayFlight])
VALUES
    (@FlightNumber
    ,@DepartureAirportId
    ,@DepartureHour
    ,@DepartureMinute
    ,@ArrivalAirportId
    ,@ArrivalHour
    ,@ArrivalMinute
    ,@IsSundayFlight
    ,@IsMondayFlight
    ,@IsTuesdayFlight
    ,@IsWednesdayFlight
    ,@IsThursdayFlight
    ,@IsFridayFlight
    ,@IsSaturdayFlight);
SELECT CAST(SCOPE_IDENTITY() as int)";
        newScheduledFlightId = await connection.ExecuteScalarAsync<int>(insertScheduledFlightSql, model);

        model.Id = newScheduledFlightId;
        var flights = model.GenerateFlights(DateTime.Now, DateTime.Now.AddMonths(12));

    var insertFlightsSql = @"INSERT INTO [dbo].[Flight]
    ([ScheduledFlightId]
    ,[Day]
    ,[ScheduledDeparture]
    ,[ActualDeparture]
    ,[ScheduledArrival]
    ,[ActualArrival])
VALUES
    (@ScheduledFlightId
    ,@Day
    ,@ScheduledDeparture
    ,@ActualDeparture
    ,@ScheduledArrival
    ,@ActualArrival)";

        await connection.ExecuteAsync(insertFlightsSql, flights);

    }
    return Ok(newScheduledFlightId);
}

{% endcodeblock %}

Note that we passed in an `IEnumerable<Flight>` as the second argument to the `ExecuteAsync` method. This is a handy shortcut in Dapper for executing a query multiple times. Instead of writing a loop and calling `ExecuteAsync` for each flight entity, we can pass in a list of flights and Dapper will execute the query once for each item in the list.

## Explicitly managing a transaction
So far, we have code that first inserts a `ScheduledFlight`, next generates a set of `Flight` entities and finally inserting all of those `Flight` entities. That's the happy path, but what happens if something goes wrong along the way. Typically when we execute a set of related write operations (inserts, updates and deletes), we want those operations to all succeed or fail together. In the database world, we have transactions to help us with this.

The nice thing about using Dapper is that it uses standard .NET database connections and transactions. There is no need to re-invent the wheel here, we can simply use the transaction patterns that have been around in .NET since for nearly 2 decades now.

After opening the connection, we call `connection.BeginTransaction()` to start a new transaction. Whenever we call `ExecuteAsync` (or any other Dapper extension method), we need to pass in that transaction. At the end of all that work, we call `transaction.Commit()`. Finally, we wrap the logic in a `try / catch` block. If any exception is raised, we call `transaction.Rollback()` to ensure that none of those write operations are committed to the database.

{% codeblock lang:csharp %}
[HttpPost()]
public async Task<IActionResult> Post([FromBody] ScheduledFlight model)
{
    int? newScheduledFlightId = null;
    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var transaction = connection.BeginTransaction();

        try
        {
            var insertScheduledFlightSql = @"
INSERT INTO [dbo].[ScheduledFlight]
    ([FlightNumber]
    ,[DepartureAirportId]
    ,[DepartureHour]
    ,[DepartureMinute]
    ,[ArrivalAirportId]
    ,[ArrivalHour]
    ,[ArrivalMinute]
    ,[IsSundayFlight]
    ,[IsMondayFlight]
    ,[IsTuesdayFlight]
    ,[IsWednesdayFlight]
    ,[IsThursdayFlight]
    ,[IsFridayFlight]
    ,[IsSaturdayFlight])
VALUES
    (@FlightNumber
    ,@DepartureAirportId
    ,@DepartureHour
    ,@DepartureMinute
    ,@ArrivalAirportId
    ,@ArrivalHour
    ,@ArrivalMinute
    ,@IsSundayFlight
    ,@IsMondayFlight
    ,@IsTuesdayFlight
    ,@IsWednesdayFlight
    ,@IsThursdayFlight
    ,@IsFridayFlight
    ,@IsSaturdayFlight);
SELECT CAST(SCOPE_IDENTITY() as int)";
            newScheduledFlightId = await connection.ExecuteScalarAsync<int>(insertScheduledFlightSql, model, transaction);

            model.Id = newScheduledFlightId.Value;
            var flights = model.GenerateFlights(DateTime.Now, DateTime.Now.AddMonths(12));

            var insertFlightsSql = @"INSERT INTO [dbo].[Flight]
    ([ScheduledFlightId]
    ,[Day]
    ,[ScheduledDeparture]
    ,[ActualDeparture]
    ,[ScheduledArrival]
    ,[ActualArrival])
VALUES
    (@ScheduledFlightId
    ,@Day
    ,@ScheduledDeparture
    ,@ActualDeparture
    ,@ScheduledArrival
    ,@ActualArrival)";

            await connection.ExecuteAsync(insertFlightsSql, flights, transaction);
            transaction.Commit();
        }
        catch (Exception ex)
        { 
            //Log the exception (ex)
            try
            {
                transaction.Rollback();
            }
            catch (Exception ex2)
            {
                // Handle any errors that may have occurred
                // on the server that would cause the rollback to fail, such as
                // a closed connection.
                // Log the exception ex2
            }
            return StatusCode(500);
        }
    }
    return Ok(newScheduledFlightId);
}

{% endcodeblock %}

Managing database transactions in .NET is a deep but well understood topic. We covered the basic pattern above and showed how Dapper can easily participate in a transaction. To learn more about managing database transactions in .NET, check out these docs:
- [SqlConnection.BeginTransaction](https://docs.microsoft.com/dotnet/api/system.data.sqlclient.sqlconnection.begintransaction)  
- [Transactions in ADO.NET](https://docs.microsoft.com/dotnet/framework/data/adonet/transactions-and-concurrency)


## Wrapping it up
Using transactions with Dapper is fairly straight forward process. We just need to tell Dapper what transaction to use when executing queries. Now that we know how to use transactions, we can look at some more advanced scenarios like adding concurrency checks to update operations to ensure users aren't overwriting each other's changes. 