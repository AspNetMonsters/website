---
layout: post
title: Integration Testing with Entity Framework Core and SQL Server
tags:
  - ASP.NET Core
  - Entity Framework
  - Testing
categories:
  - Development
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2016/11/27/integration-testing-with-entity-framework-core-and-sql-server.aspx'
date: 2016-11-27 17:00:00
excerpt: Entity Framework Core makes it easy to write tests that execute against an in-memory store but sometimes we want to actually run our tests against a real relational database. In this post, we look at how to create an integration test that runs against a real SQL Server database.
---
Entity Framework Core makes it easy to write tests that execute against an in-memory store. Using an in-memory store is convenient since we don't need to worry about setting up a relational database. It also ensures our unit tests run quickly so we aren't left waiting hours for a large test suite to complete.

While Entity Framework Core's in-memory store works great for many scenarios, there are some situations where it might be better to run our tests against a real relational database. Some examples include when loading entities using raw SQL or when using SQL Server specific features that can not be tested using the in-memory provider. In this case, the tests would be considered an integration test since we are no longer testing our Entity Framework context in isolation. We are testing how it will work in the real world when connected to SQL Server.

## The Sample Project
For this example, I used the following simple model and DbContext classes.

{% codeblock lang:csharp %}
public class Monster
{
    public int Id { get; set; }
    public string Name { get; set; }
    public bool IsScary { get; set; }        
    public string Colour { get; set; }
}
{% endcodeblock %}

{% codeblock lang:csharp %}
public class MonsterContext : DbContext
{
    public MonsterContext(DbContextOptions<MonsterContext> options)
        : base(options)
    {
    }

    public DbSet<Monster> Monsters { get; set; }
}
{% endcodeblock %}

In an ASP.NET Core application, the context is configured to use SQL Server in the `Startup.ConfigureServices` method.

{% codeblock lang:csharp %}
services.AddDbContext<MonsterContext>(options =>
{
    options.UseSqlServer("DefaultConnection");
});
{% endcodeblock %}

The `DefaultConnection` is defined in `appsettings.json` which is loaded at startup.

{% codeblock lang:javascript %}
{
    "ConnectionStrings": {
        "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=monsters_db;Trusted_Connection=True;MultipleActiveResultSets=true"
    }
}
{% endcodeblock %}

The `MonsterContext` is also configured to use Migrations which were initialized using the `dotnet ef migrations add InitialCreate` command. For more on Entity Framework Migrations, see the [official tutorial](https://docs.microsoft.com/en-us/aspnet/core/data/ef-mvc/migrations).

As a simple example, I created a query class that loads *scary* monsters from the database using a SQL query instead of querying the `Monsters` `DbSet` directly.    

{% codeblock lang:csharp %}
public class ScaryMonstersQuery
{
    private MonsterContext _context;

    public ScaryMonstersQuery(MonsterContext context)
    {
        _context = context;
    }

    public IEnumerable<Monster> Execute()
    {
        return _context.Monsters
            .FromSql("SELECT Id, Name, IsScary, Colour FROM Monsters WHERE IsScary = {0}", true);
    }
        
}
{% endcodeblock %}

To be clear, a better way to write this query is `_context.Monster.Where(m => m.IsScary == true)`, but I wanted a simple example. I also wanted to use `FromSql` because it is inherently difficult to unit test. The `FromSql` method doesn't work with the in-memory provider since it requires a relational database. It is also an extension method which means we can't simply mock the context using a tool like `Moq`. We could of course create a wrapper service that calls the `FromSql` extension method and mock that service but this only shifts the problem. The _wrapper_ approach would allow us to ensure that `FromSql` is called in the way we expect it to be called but it would not be able to ensure that the query will actually run successfully and return the expected results.

An integration test is a good option here since it will ensure that the query runs exactly as expected against a real SQL Server database.

## The Test
I used xunit as the test framework in this example. In the constructor, which is the setup method for any tests in the class, I configure an instance of the `MonsterContext` connecting to a localdb instance using a database name containing a random guid. Using a guid in the database name ensures the database is unique for this test. Uniqueness is important when running tests in parallel because it ensures these tests won't impact any other tests that aer currently running. After creating the context, a call to `_context.Database.Migrate()` creates a new database and applies any Entity Framework migrations that are defined for the `MonsterContext`.  

{% codeblock lang:csharp %}
public class SimpleIntegrationTest : IDisposable
{
    MonsterContext _context;

    public SimpleIntegrationTest()
    {
        var serviceProvider = new ServiceCollection()
            .AddEntityFrameworkSqlServer()
            .BuildServiceProvider();

        var builder = new DbContextOptionsBuilder<MonsterContext>();

        builder.UseSqlServer($"Server=(localdb)\\mssqllocaldb;Database=monsters_db_{Guid.NewGuid()};Trusted_Connection=True;MultipleActiveResultSets=true")
                .UseInternalServiceProvider(serviceProvider);

        _context = new MonsterContext(builder.Options);
        _context.Database.Migrate();

    }

    [Fact]
    public void QueryMonstersFromSqlTest()
    {
        //Add some monsters before querying
        _context.Monsters.Add(new Monster { Name = "Dave", Colour = "Orange", IsScary = false });
        _context.Monsters.Add(new Monster { Name = "Simon", Colour = "Blue", IsScary = false });
        _context.Monsters.Add(new Monster { Name = "James", Colour = "Green", IsScary = false });
        _context.Monsters.Add(new Monster { Name = "Imposter Monster", Colour = "Red", IsScary = true });
        _context.SaveChanges();

        //Execute the query
        ScaryMonstersQuery query = new ScaryMonstersQuery(_context);
        var scaryMonsters = query.Execute();

        //Verify the results
        Assert.Equal(1, scaryMonsters.Count());
        var scaryMonster = scaryMonsters.First();
        Assert.Equal("Imposter Monster", scaryMonster.Name);
        Assert.Equal("Red", scaryMonster.Colour);
        Assert.True(scaryMonster.IsScary);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
    }
}
{% endcodeblock %}

The actual test itself happens in the `QueryMonstersFromSqlTest` method. I start by adding some sample data to the database. Next, I create and execute the `ScaryMonstersQuery` using the context that was created in the setup method. Finally, I verify the results, ensuring that the expected data is returned from the query.

The last step is the `Dispose` method which in xunit is the teardown for any tests in this class. We don't want all these test databases hanging around forever so this is the place to delete the database that was created in the setup method. The database is deleted by calling `_context.Database.EnsureDeleted()`. 

## Use with Caution
These tests are slow! The very simple example above takes 13 seconds to run on my laptop. My advice here is to use this sparingly and only when it really adds value for your project. If you end up with a large number of these integration tests, I would consider splitting the integration tests into a separate test suite and potentially running them on a different schedule than my unit test suite (e.g. Nightly instead of every commit). 

## The Code
You can browse or download the source on [GitHub](https://github.com/AspNetMonsters/EntityFrameworkCoreIntegrationTest).