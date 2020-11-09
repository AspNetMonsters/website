---
layout: post
title: Running Stored Procedures Across Databases in Azure
authorId: simon_timms
date: 2020-11-09 14:00
originalurl: https://blog.simontimms.com/2020/11/09/2020-11-09-cross-database-procs/
---

In a [previous article](https://blog.simontimms.com/2020/11/05/2020-11-05-cross-database-queries/) I talked about how to run queries across database instances on Azure using ElasticQuery. One of the limitations I talked about was the in ability to update data in the source database. Well that isn't entirely accurate. You can do it if you make use of stored procedures. 

<!-- more -->

Running a stored proc on a remote database is a little bit weird looking but once you get your head around that then it is perfectly usable. Let's go back to the same example we used before with a products database an an orders database. In the products database let's add a stored procedure to add a new product and return the count of products.

```sql
create procedure addProduct
 @item nvarchar(50)
as
	insert into Products(name) values(@item);
	select count(*) cnt from products;
go
```

Now over in our orders database we can use our existing database connection to call this stored proc

```sql
sp_execute_remote ProductsSource, 
                  N'addProduct @item', 
                  @params = N'@item nvarchar(50)', 
                  @item = 'long sleeved shirts';
```

At first glance this is a little confusing so let's break it down. 

```sql
sp_execute_remote ProductsSource, 
```
This line instructs that we want to run a stored procedure and that it should use the ProductsSource data connection. 

```sql
N'addProduct @item', 
```
This line lists the stored proc to run and the parameters to pass to it. You'll notice that it is a NVarchar string passed as a single parameter.

```sql
@params = N'@item nvarchar(50)', 
```

This line lists all the parameters to pass and their type. If you have multiple then you'd comma separate them here: `N'@item nvarchar(50), @price number(10,2)'`

```
@item = 'long sleeved shirts';
```

This final line is an args-style array of the values for the parameters. Again if you had a second parameter you'd pass it in as separate item here `@item = 'long sleeved shirts', @price=10.99`

Running this command gets us something like 

```
cnt	  $ShardName
6	  [DataSource=testias.database.windows.net Database=testias]
```

You'll notice that nifty ShardName colum which tells you about the source. This is because you can use a shard map to execute the stored procedure against lots of shards at once.