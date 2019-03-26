---
layout: post
title: Using Noda Time with Entity Framework Core
tags:
  - Entity Framework Core
  - Noda Time
categories:
 - Development
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2015/12/28/using-noda-time-with-ef-core.aspx'
date: 2019-03-26 07:00:00
excerpt: Noda Time is a fantastic date/time library for .NET. I started using it recently and it really simplified the logic around handling dates. Unfortunately, I ran in to some problems with using Noda Time together with Entity Framework Core.
---
If you have ever dealt dates/times in an environment that crosses time zones, you know who difficult it can be to handle all scenarios properly. This situation isn't made any better by .NET's somewhat limited representation of date and time values through the one `DateTime` class. For example, how to I represent a date in .NET when I don't care about the time. There is no type that represents a `Date` on it's own. That's why the [Noda Time](https://nodatime.org/) library was created, billing itself as a better date and time API for .NET.

> Noda Time is an alternative date and time API for .NET. It helps you to think about your data more clearly, and express operations on that data more precisely.

## An example using NodaTime

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

## Using Entity Framework

This app was using Entity Framework Core and there was a `DbSet` for the `Event` class.

{% codeblock lang:csharp %}
public class EventContext : DbContext
{
    public EventContext(DbContextOptions<EventContext> options) : base(options)
    {
    }

    public DbSet<Event> Events { get; set; }
}
{% endcodeblock %}

This is where I ran into my first problem. Attempting to run the app, I was greeted with a friendly `InvalidOperationException`:

> InvalidOperationException: The property 'Event.Date' could not be mapped, because it is of type 'LocalDate' which is not a supported primitive type or a valid entity type. Either explicitly map this property, or ignore it using the '[NotMapped]' attribute or by using 'EntityTypeBuilder.Ignore' in 'OnModelCreating'.

This first problem was actually easy enough to solve using a [`ValueConverter`](https://docs.microsoft.com/ef/core/modeling/value-conversions). By adding the following `OnModelCreating` code to my `EventContext`, I was able to tell Entity Framework Core to store the `Date` property as a `DateTime` with the Kind set to [`DateTimeKind.Unspecified`](https://docs.microsoft.com/dotnet/api/system.datetimekind#System_DateTimeKind_Unspecified). This has the effect of avoiding any unwanted shifts in the date time based on the local time of the running process. 

{% codeblock lang:csharp %}
public class EventContext : DbContext
{
    public EventContext(DbContextOptions<EventContext> options) : base(options)
    {
    }

    public DbSet<Event> Events { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        var localDateConverter = 
            new ValueConverter<LocalDate, DateTime>(v =>  
                v.ToDateTimeUnspecified(), 
                v => LocalDate.FromDateTime(v));

        modelBuilder.Entity<Event>()
            .Property(e => e.Date)
            .HasConversion(localDateConverter);
    }
}
{% endcodeblock %}

With that small change, my application now worked as expected. The value conversions all happen behind the scenes so I can just use the `Event` entity and deal strictly with the `LocalDate` type.

## But what about queries
I actually had this application running in a test environment for a week before I noticed a serious problem in the log files.

In my app, I was executing a simple query to retrieve the list of events for a particular date.

{% codeblock lang:csharp %}
var queryDate = new LocalDate(2019, 3, 25);
Events = await context.Events.Where(e => e.Date == queryDate).ToListAsync();
{% endcodeblock %}

In the app's log file, I noticed the following warning:

> Microsoft.EntityFrameworkCore.Query:Warning: The LINQ expression 'where ([e].Date == __queryDate_0)' could not be translated and will be evaluated locally.

Uh oh, that sounds bad. I did a little more investigation and confirmed that the query was in fact executing SQL without a `WHERE` clause.

{% codeblock lang:sql %}
SELECT [e].[Id], [e].[Date], [e].[Description], [e].[Name]
FROM [Events] AS [e]
{% endcodeblock %}

So my app was retrieving **EVERY ROW** from `Events` table, then applying the where filter in the .NET process. That's really not what I intended to do and would most certainly cause me some performance troubles when I get to production.

So, the first thing I did was modified my EF Core configuration to throw an error when a client side evaluation like this occurs. I don't want this kind of thing accidently creeping in to this app again. Over in `Startup.ConfigureServices`, I added the following option to `ConfigureWarnings`. 

{% codeblock lang:csharp %}
services.AddDbContext<EventContext>(options =>
        options.UseSqlServer(myConnectionString)
        .ConfigureWarnings(warnings => 
            warnings.Throw(RelationalEventId.QueryClientEvaluationWarning)));
{% endcodeblock %}

Throwing an error by default is the correct behavior here and this is actually something that will be fixed in Entity Framework Core 3.0. The default behavior in EF Core 3 will be to throw an error any time a LINQ expression results in client side evaluation. You will then have the option to allow those client side evaluations. 

## Fixing the query
Now that I had the app throwing an error for this query, I needed to find a way for EF Core to properly translate my simple `e.Date == queryDate` expression to SQL. After carefully re-reading the EF Core documentation related for value converters, I noticed a bullet point under Limitations:

> Use of value conversions may impact the ability of EF Core to translate expressions to SQL. A warning will be logged for such cases. Removal of these limitations is being considered for a future release.

Well that just plain sucks. It turns out that when you use a value converter for a property, Entity Framework Core just gives up trying to convert any LINQ expression that references that property. The only solution I found was to query for my entities using SQL.

{% codeblock lang:csharp %}
var queryDate = new LocalDate(2019, 3, 25);
Events = await context.Events.
    FromSql(@"SELECT [e].[Id], [e].[Date], [e].[Description], [e].[Name]
FROM[Events] AS[e]
WHERE [e].[Date] = {0}", queryDate.ToDateTimeUnspecified()).ToListAsync();
{% endcodeblock %}

## Wrapping it up
NodaTime is a fantastic date and time library for .NET and you should definitely consider using it in your app. Unfortunately, Entity Framework Core has some serious limitations when it comes to using value converters so you will need to be careful. I almost got myself into some problems with it. While there are work-arounds, writing custom SQL for any query that references a NodaTime type is less than ideal. Hopefully those will be addressed in Entity Framework Core 3.  