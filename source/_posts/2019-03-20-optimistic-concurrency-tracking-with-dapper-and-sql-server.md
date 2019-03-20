---
layout: post
title: Optimistic Concurrency Tracking with Dapper and SQL Server
tags:
  - Dapper
  - .NET 
  - .NET Core
  - Micro ORM
categories:
 - Development
authorId: dave_paquette
originalurl: 'https://www.davepaquette.com/archive/2019/03/20/optimistic-concurrency-tracking-with-dapper-and-sql-server.aspx'
date: 2019-03-20 09:45:36
excerpt: This is a part of a series of blog posts on data access with Dapper. In today's post, we explore optimistic checks to ensure 2 users can't accidentally overwrite each other's updates to a particular row of data.
---
This is a part of a series of blog posts on data access with Dapper. To see the full list of posts, visit the [Dapper Series Index Page](https://www.davepaquette.com/archive/2018/01/21/exploring-dapper-series.aspx).
  
In today's post, we explore a pattern to prevent multiple users (or processes) from accidentally overwriting each other's change. Given our [current implementation for updating the `Aircraft` record](https://www.davepaquette.com/archive/2019/02/04/basic-insert-update-delete-with-dapper.aspx), there is potential for data loss if there are multiple active sessions are attempting to update the same `Aircraft` record at the same time. In the example shown below, Bob accidentally overwrites Jane's changes without even knowing that Jane made changes to the same `Aircraft` record

![Concurrent Updates](https://www.davepaquette.com/images/dapper/concurrency.png)

The pattern we will use here is [Optimistic Offline Lock](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html), which is often also referred to as Optimistic Concurrency Control.

## Modifying the Database and Entities
To implement this approach, we will use a [rowversion column in SQL Server](https://docs.microsoft.com/sql/t-sql/data-types/rowversion-transact-sql). Essentially, this is a column that automatically version stamps a row in a table. Any time a row is modified, the `rowversion` column will is automatically incremented for that row. We will start by adding the column to our `Aircraft` table.

{% codeblock lang:sql %}
ALTER TABLE Aircraft ADD RowVer rowversion
{% endcodeblock %}

Next, we add a `RowVer` property to the `Aircraft` table. The property is a `byte` array. When we read the `RowVer` column from the database, we will get an array of 8 bytes.  

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
    public byte[] RowVer { get; set; }
}   
{% endcodeblock %}

Finally, we will modify the query used to load `Aircraft` entities so it returns the `RowVer` column. We don't need to change any of the Dapper code here.

{% codeblock lang:csharp %}
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
,RowVer
FROM Aircraft WHERE Id = @Id";
        aircraft = await connection.QuerySingleAsync<Aircraft>(query, new {Id = id});
    }
    return aircraft;
}
{% endcodeblock %}

## Adding the Concurrency Checks
Now that we have the row version loaded in to our model, we need to add the checks to ensure that one user doesn't accidentally overwrite another users changes. To do this, we simply need to add the `RowVer` to the `WHERE` clause on the `UPDATE` statement. By adding this constraint to the `WHERE` clause, we we ensure that the updates will only be applied if the `RowVer` has not changed since this user originally loaded the `Aircraft` entity.

{% codeblock lang:csharp %}
public async Task<IActionResult> Put(int id, [FromBody] Aircraft model)
{
    if (id != model.Id) 
    {
        return BadRequest();
    }

    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var query = @"
UPDATE Aircraft 
SET  Manufacturer = @Manufacturer
  ,Model = @Model
  ,RegistrationNumber = @RegistrationNumber 
  ,FirstClassCapacity = @FirstClassCapacity
  ,RegularClassCapacity = @RegularClassCapacity
  ,CrewCapacity = @CrewCapacity
  ,ManufactureDate = @ManufactureDate
  ,NumberOfEngines = @NumberOfEngines
  ,EmptyWeight = @EmptyWeight
  ,MaxTakeoffWeight = @MaxTakeoffWeight
WHERE Id = @Id
      AND RowVer = @RowVer";
      
      await connection.ExecuteAsync(query, model);
    }

    return Ok();
}
{% endcodeblock %}

So, the `WHERE` clause stops the update from happening, but how do we know if the update was applied successfully? We need to let the user know that the update was not applied due to a concurrency conflict. To do that, we add `OUTPUT inserted.RowVer` to the `UPDATE` statement. The effect of this is that the query will return the new value for the `RowVer` column if the update was applied. If not, it will return null. 

{% codeblock lang:csharp %}
public async Task<IActionResult> Put(int id, [FromBody] Aircraft model)
{
    byte[] rowVersion;
    if (id != model.Id) 
    {
        return BadRequest();
    }

    using (var connection = new SqlConnection(_connectionString))
    {
        await connection.OpenAsync();
        var query = @"
UPDATE Aircraft 
SET  Manufacturer = @Manufacturer
  ,Model = @Model
  ,RegistrationNumber = @RegistrationNumber 
  ,FirstClassCapacity = @FirstClassCapacity
  ,RegularClassCapacity = @RegularClassCapacity
  ,CrewCapacity = @CrewCapacity
  ,ManufactureDate = @ManufactureDate
  ,NumberOfEngines = @NumberOfEngines
  ,EmptyWeight = @EmptyWeight
  ,MaxTakeoffWeight = @MaxTakeoffWeight
  OUTPUT inserted.RowVer
WHERE Id = @Id
      AND RowVer = @RowVer";
        rowVersion = await connection.ExecuteScalarAsync<byte[]>(query, model);
    }

    if (rowVersion == null) {
        throw new DBConcurrencyException("The entity you were trying to edit has changed. Reload the entity and try again."); 
    }
    return Ok(rowVersion);
}
{% endcodeblock %}

Instead of calling `ExecuteAsync`, we call `ExecuteScalarAsync<byte[]>`. Then we can check if the returned value is `null` and raise a `DBConcurrencyException` if it is null. If it is not null, we can return the new `RowVer` value. 


# Wrapping it up
Using SQL Server's `rowversion` column type makes it easy to implement optimistic concurrency checks in a .NET app that uses Dapper.

If you are building as REST api, you should really use the ETag header to represent the current RowVer for your entity. You can read more about this pattern [here](https://sookocheff.com/post/api/optimistic-locking-in-a-rest-api/).

