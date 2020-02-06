---
layout: post
title: Setting Cloud Role Name in Application Insights
tags:
  - .NET
  - .NET Core
  - Application Insights
  - Azure
categories:
  - Application Insights
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2020/02/05/setting-cloud-role-name-in-application-insights.aspx'
date: 2020-02-05 19:59:38
excerpt: A continuation in my series of love letters about Application Insights. Today I dig into the importance of setting cloud role name. 
---
This post is a continuation of my series about using [Application Insights in ASP.NET Core](http://www.davepaquette.com/archive/2020/01/20/getting-the-most-out-of-application-insights-for-net-core-apps.aspx). Today we will explore the concept of Cloud Role and why it's an important thing to get right for your application.

In any application that involves more than a single server process/service, the concept of _Cloud Role_ becomes really important in Application Insights. A Cloud Role roughly represents a process that runs somewhere on a server or possibly on a number of servers. A cloud role made up of 2 things: a _cloud role name_ and a _cloud role instance_. 

## Cloud Role Name
The cloud role name is a logical name for a particular process. For example, I might have a cloud role name of "Front End" for my front end web server and a name of "Weather Service" for a service that is responsible for providing weather data.

When a cloud role name is set, it will appear as a node in the Application Map. Here is an example showing a Front End role and a Weather Service role.

![Application Map when Cloud Role Name is set ](https://www.davepaquette.com/images/app_insights/example_application_map.png)

However, when Cloud Role Name is not set, we end up with a misleading visual representation of how our services communicate. 
![Application Map when Cloud Role Name is not set ](https://www.davepaquette.com/images/app_insights/example_application_map_no_cloud_role_name.png)

By default, the application insights SDK attempts to set the cloud role name for you. For example, when you're running in Azure App Service, the name of the web app is used. However, when you are running in an on-premise VM, the cloud role name is often blank.

## Cloud Role Instance
The cloud role instance tells us which specific server the cloud role is running on. This is important when scaling out your application. For example, if my Front End web server was running 2 instances behind a load balancer, I might have a cloud role instance of "frontend_prod_1" and another instance of "frontend_prod_2". 

The application insights SDK sets the cloud role instance to the name of the server hosting the service. For example, the name of the VM or the name of the underlying compute instance hosting the app in App Service. In my experience, the SDK does a good job here and I don't usually need to override the cloud role instance.

## Setting Cloud Role Name using a Telemetry Initializer
Telemetery Initializers are a powerful mechanism for customizing the telemetry that is collected by the Application Insights SDK. By creating and registering a telemetry initializer, you can overwrite or extend the properties of any piece of telemetry collected by Application Insights.

To set the Cloud Role Name, create a class that implements `ITelemetryInitializer` and in the `Initialize` method set the `telemetry.Context.Cloud.RoleName` to the cloud role name for the current application. 

{% codeblock lang:cs %}
public class CloudRoleNameTelemetryInitializer : ITelemetryInitializer
{
    public void Initialize(ITelemetry telemetry)
    {
      // set custom role name here
      telemetry.Context.Cloud.RoleName = "Custom RoleName";
    }
}
{% endcodeblock %}

Next, in the `Startup.ConfigureServices` method, register that telemetry initializer as a singleton.

{% codeblock lang:cs %}
services.AddSingleton<ITelemetryInitializer, CloudRoleNameTelemetryInitializer>();
{% endcodeblock %}

For those who learn by watching, I have recorded a video talking about using telemetry initializers to customize application insights.
<iframe width="640" height="360" src="https://www.youtube.com/embed/1OAaYb_HL5g?list=PLFHLo5Y9d4JaGXNF80SzymGTkbmED6VoO" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Using a Nuget Package
Creating a custom telemetry initializer to set the cloud role name is a simple enough, but it's something I've done so many times that I decided to publish a [Nuget package](https://www.nuget.org/packages/AspNetMonsters.ApplicationInsights.AspNetCore/) to simplify it even further.

First, add the `AspNetMonsters.ApplicationInsights.AspNetCore` Nuget package:
```
dotnet add package AspNetMonsters.ApplicationInsights.AspNetCore
```

Next, in call `AddCloudRoleNameInitializer` in your application's `Startup.ConfigureServices` method:
```
services.AddCloudRoleNameInitializer("WeatherService");
```

## Filtering by Cloud Role 
Setting the Cloud Role Name / Instance is about a lot more than seeing your services laid out properly in the Application Map. It's also really important when you starting digging in to the performance and failures tabs in the Application Insights portal. In fact, on most of the sections of the portal, you'll see this Roles filter.

![Roles pill](https://www.davepaquette.com/images/app_insights/roles_pill.png)

The default setting is _all_. When you click on it, you have the option to select any combination of your application's role names / instances. For example, maybe I'm only interested in the _FrontEnd_ service and _WeatherService_ that were running on the dave_yoga920 instance.

![Roles filter](https://www.davepaquette.com/images/app_insights/roles_filter.png)

These filters are extremely useful when investigating performance or errors on a specific server or within a specific service. The more services your application is made up of, the more useful and essential this filtering become. These filters really help focus in on specific areas of an application within the Application Insights portal.

## Next Steps
In this post, we saw how to customize telemetry data using telemetry initializers. Setting the cloud role name is a simple customization that can help you navigate the massive amount of telemetry that application insights collects. In the next post, we will explore a more in complex example of using telemetry initializers.