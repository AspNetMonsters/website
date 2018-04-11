---
layout: post
title: Loading Related Entities with Dapper Many-to-One - Part 2
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
categories:
  - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2018/04/10/loading-related-entities-many-to-one-part-2.aspx'
date: 2018-04-10 18:04:42
excerpt: This is a part of a series of blog posts on data access with Dapper. In today's post, we look at a second option for loading Many-to-One related entities.
---
This is a part of a series of blog posts on data access with Dapper. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).
 
In today's post, we look at another option for how to load Many-to-One relationships. In the last post, we used a technique called Multi-Mapping to load related Many-to-One entities. In that post, I had a theory that maybe this approach was not the most efficient method for loading related entities because it duplicated a lot of data.

![Many-to-One](https://www.davepaquette.com/images/dapper/flight_to_airport_many_to_one.png)

To recap, we would like to load a list of `ScheduledFlight` entities. A `ScheduleFlight` has a departure `Airport` and an arrival `Airport`.

{% codeblock lang:csharp %}
public class ScheduledFlight 
{
    public int Id {get; set;}
    public string FlightNumber {get; set;}

    public Airport DepartureAirport {get; set;}
    public int DepartureHour {get; set;}
    public int DepartureMinute {get; set;}

    public Airport ArrivalAirport {get; set;}        
    public int ArrivalHour {get; set;}
    public int ArrivalMinute {get; set;}

   //Other properties omitted for brevity 
}

public class Airport 
{
    public int Id {get; set;}
    public string Code {get; set;}
    public string City {get; set;}
    public string ProvinceState {get; set;}
    public string Country {get; set;}
}
{% endcodeblock %} 

## Using Multiple Result Sets
In the previous post, we loaded the `ScheduledFlight` entities and all related `Airport` entities in a single query. In this example we will use 2 separate queries: One for the `ScheduledFlight` entities, one for the related arrival and departure `Airport` entities. These 2 queries will all be executed as a single sql command that returns multiple result sets. 

{% codeblock lang:sql %}
SELECT s.Id, s.FlightNumber, s.DepartureHour, s.DepartureMinute, s.ArrivalHour, s.ArrivalMinute, s.IsSundayFlight, s.IsMondayFlight, s.IsTuesdayFlight, s.IsWednesdayFlight, s.IsThursdayFlight, s.IsFridayFlight, s.IsSaturdayFlight,
s.DepartureAirportId, s.ArrivalAirportId
FROM ScheduledFlight s
	INNER JOIN Airport a1
		ON s.DepartureAirportId = a1.Id
    WHERE a1.Code = @FromCode
    
SELECT a1.Id, a1.Code, a1.City, a1.ProvinceState, a1.Country
FROM Airport a1
	WHERE a1.Code = @FromCode
UNION    
SELECT DISTINCT a2.Id, a2.Code, a2.City, a2.ProvinceState, a2.Country
FROM ScheduledFlight s
	INNER JOIN Airport a1
		ON s.DepartureAirportId = a1.Id
    INNER JOIN Airport a2
		ON s.ArrivalAirportId = a2.Id
    WHERE a1.Code = @FromCode
{% endcodeblock %}  

Using Dapper's `QueryMultipleAsync` method, we pass in 2 arguments: the query and the parameters for the query. 

{% codeblock lang:csharp %}
public async Task<IEnumerable<ScheduledFlight>> GetAlt(string from)
{
  IEnumerable<ScheduledFlight> scheduledFlights;
  using (var connection = new SqlConnection(_connectionString))
  {
  await connection.OpenAsync();
  var query = @"
SELECT s.Id, s.FlightNumber, s.DepartureHour, s.DepartureMinute, s.ArrivalHour, s.ArrivalMinute, s.IsSundayFlight, s.IsMondayFlight, s.IsTuesdayFlight, s.IsWednesdayFlight, s.IsThursdayFlight, s.IsFridayFlight, s.IsSaturdayFlight,
s.DepartureAirportId, s.ArrivalAirportId
FROM ScheduledFlight s
	INNER JOIN Airport a1
		ON s.DepartureAirportId = a1.Id
    WHERE a1.Code = @FromCode
    
SELECT a1.Id, a1.Code, a1.City, a1.ProvinceState, a1.Country
FROM Airport a1
	WHERE a1.Code = @FromCode
UNION    
SELECT DISTINCT a2.Id, a2.Code, a2.City, a2.ProvinceState, a2.Country
FROM ScheduledFlight s
	INNER JOIN Airport a1
		ON s.DepartureAirportId = a1.Id
    INNER JOIN Airport a2
		ON s.ArrivalAirportId = a2.Id
    WHERE a1.Code = @FromCode";

    using (var multi = await connection.QueryMultipleAsync(query, new{FromCode = from} ))
    {
        scheduledFlights = multi.Read<ScheduledFlight>();
        var airports = multi.Read<Airport>().ToDictionary(a => a.Id);
        foreach(var flight in scheduledFlights)
        {
            flight.ArrivalAirport = airports[flight.ArrivalAirportId];
            flight.DepartureAirport = airports[flight.DepartureAirportId];
        }

    }
  }
  return scheduledFlights;
}
{% endcodeblock %}  

The `QueryMultipleAsync` method returns a `GridReader`. The `GridReader` makes it very easy to map mutliple result sets to different objects using the `Read<T>` method. When you call the `Read<T>` method, it will read all the results from the next result set that was returned by the query. In our case, we call `Read<ScheduledFlight>` to read the first result set and map the results into a collection of `ScheduledFlight` entities. Next, we call `Read<Airport>` to read the second result set. We then call `ToDictionary(a => a.Id)` to populate those `Airport` entities into a dictionary. This is to make it easier to read the results when setting the `ArrivalAirport` and `DepartureAirport` properties for each `ScheduledFlight`. 

Finally, we iterate through the scheduled flights and set the `ArrivalAirport` and `DepartureAirport` properties to the correct `Airport` entity.  

The big difference between this approach and the previous approach is that we no longer have duplicate instances for `Airport` entities. For example, if the query returned 100 scheduled flights departing from Calgary (YYC), there would be a single instance of the `Airport` entity representing YYC, whereas the previous approach would have resulted in 100 separate instances of the `Airport` entity.

There is also less raw data returned by the query itself since the columns from the `Airport` table are not repeated in each row from the `ScheduleFlight` table.

## Comparing Performance
I had a theory that the multi-mapping approach outlined in the previous blog post would be less efficient than the multiple result set approach outlined in this blog post, at least from a memory usage perspective. However, a theory is just theory until it is tested. I was curious and also wanted to make sure I wasn't misleading anyone so I decided to test things out using [Benchmark.NET](http://benchmarkdotnet.org/). Using Benchmark.NET, I compared both methods using different sizes of data sets.

I won't get into the details of Benchmark.NET. If you want to dig into it in more detail, visit the [official site](http://benchmarkdotnet.org/) and read through the docs. For the purposes of this blog post, the following legend should suffice:

```
  Mean      : Arithmetic mean of all measurements
  Error     : Half of 99.9% confidence interval
  StdDev    : Standard deviation of all measurements
  Gen 0     : GC Generation 0 collects per 1k Operations
  Gen 1     : GC Generation 1 collects per 1k Operations
  Gen 2     : GC Generation 2 collects per 1k Operations
  Allocated : Allocated memory per single operation (managed only, inclusive, 1KB = 1024B)
```

### 10 ScheduledFlight records
|             Method |     Mean |    Error |    StdDev |  Gen 0 | Allocated |
|------------------- |---------:|---------:|----------:|-------:|----------:|
|       MultiMapping | 396.9 us | 7.392 us |  7.260 us | 5.8594 |   6.77 KB |
| MultipleResultSets | 467.6 us | 9.194 us | 16.811 us | 4.8828 |   6.69 KB |

As I suspected, the difference is minimal when dealing with small result sets. The results here are in microseconds so in both cases, executing the query and mapping the results takes less 1/2 a millisecond. The mutliple result sets approach takes a little longer, which I kind of expected because of the overhead of creating a dictionary and doing lookups into that dictionary when setting the `ArrivalAirport` and `DepartureAirport` properties. The difference is minimal and in a most real world scenarios, this won't be noticable. What is interesting is that even with this small amount of data, we can see that there is ~1 more Gen 0 garbage collection happening per 1,000 operations. I suspect we will see this creep up as the amount of data increases.


### 100 ScheduledFlight records

|             Method |     Mean |     Error |    StdDev |   Gen 0 |  Gen 1 | Allocated |
|------------------- |---------:|----------:|----------:|--------:|-------:|----------:|
|       MultiMapping | 1.013 ms | 0.0200 ms | 0.0287 ms | 25.3906 | 5.8594 |   6.77 KB |
| MultipleResultSets | 1.114 ms | 0.0220 ms | 0.0225 ms | 15.6250 |      - |   6.69 KB |

 Okay, this surprised me a little. I expected to see a bigger different between the two but they are still, essentially the same in terms of time. The multi-mapping approach is still slightly faster. Keep in mind that both are still just a little over 1ms to query and map 100 records. That's crazy fast! 

 ### 1000 ScheduledFlight records
|              Method |     Mean |     Error |    StdDev |    Gen 0 |   Gen 1 | Allocated |
|------------------- |---------:|----------:|----------:|---------:|--------:|----------:|
|       MultiMapping | 5.137 ms | 0.1006 ms | 0.1443 ms | 148.4375 | 70.3125 |   6.77 KB |
| MultipleResultSets | 3.459 ms | 0.0408 ms | 0.0341 ms | 113.2813 | 27.3438 |   6.69 KB |

Here we go. Now the multiple result sets approach finally wins out, and you can see why. There are way more Gen 0 and Gen 1 garbage collections happening per 1,000 operations when using the multi-mapping approach. 

 ### 10,000 ScheduledFlight records
|              Method |     Mean |     Error |   StdDev |     Gen 0 |    Gen 1 |    Gen 2 | Allocated |
|------------------- |---------:|----------:|---------:|----------:|---------:|---------:|----------:|
|       MultiMapping | 58.51 ms | 1.1483 ms | 1.276 ms | 1687.5000 | 687.5000 | 187.5000 |   6.78 KB |
| MultipleResultSets | 38.23 ms | 0.8821 ms | 1.918 ms |  812.5000 | 312.5000 | 125.0000 |   6.69 KB |

One last test with 10,000 records shows a more substantial difference. The multiple result sets approach is a full 20ms faster!

## Wrapping it up
I think that in most realistic scenarios, there is no discernable difference between the 2 approaches to loading many-to-one related entities. If you loading larger amounts of records into memory in a single query, then the multiple result sets approach will likely give you better performance. If you are dealing with < 100 records per query, then you likely won't notice a difference. Keep in mind also that your results will vary depending on the specific data you are loading. 
