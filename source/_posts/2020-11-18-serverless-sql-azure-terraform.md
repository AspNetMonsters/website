---
layout: post
title: Allocating a Serverless Database in SQL Azure
authorId: simon_timms
date: 2020-11-18 14:00
originalurl: https://blog.simontimms.com/2020/11/18/2020-11-18-serverless-sql-terraform/
---

I'm pretty big on the SQL Azure Serverless SKU. It allows you to scale databases up and down automatically within a band of between 0.75 and 40 vCores on Gen5 hardware. It also supports auto-pausing which can shut down the entire database during periods of inactivity. I'm provisioning a bunch of databases for a client and we're not sure what performance tier is going to be needed. Eventually we may move to an elastic pool but initially we wanted to allocate the databases in a serverless configuration so we can ascertain a performance envelope. We wanted to allocate the resources in a terraform template but had a little trouble figuring it out. 

<!--more -->

Traditionally we've been using the resource `azurerm_sql_database` for our databases but this provider is starting to be deprecated in favour of `azurerm_mssql_database` which has better support for some of the more modern concept in SQL Azure. The [documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database#state) is pretty good for it but while there was a `min_capacity` we couldn't find an equivalent `max_capacity`. Turns out you can set the max capacity using the SKU. So we had something like 

```
resource "azurerm_mssql_database" "database" {
  name                        = var.database_name
  server_id                   = var.database_server_id
  max_size_gb                 = var.database_max_size_gb
  auto_pause_delay_in_minutes = -1
  min_capacity                = 1
  sku_name                    = "GP_S_Gen5_6"
  tags = {
    environment = var.prefix
  }
  short_term_retention_policy {
    retention_days = 14
  }
}

```

This allocates a database with a capacity of between 1 and 6 vCPU that has auto pause disabled. The S in the GP_S_Gen5_6 stands for serverless and the 6 denotes the maximum capacity. 