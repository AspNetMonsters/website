---
layout: post
title: Installing an Azure Web App Site Extension with PowerShell
tags:
  - Azure
  - App Service
  - Web App
  - Powershell
  - Application Insights
categories:
  - Development
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2018/11/13/installing-an-azure-web-app-site-extension-with-powershell.aspx'
date: 2018-11-13 19:43:50
excerpt: I recently ran into a scenario where I needed to script the installation of a site extension into an existing Azure Web App. The solution was not easy to find but I eventually got to a solution.
---
I recently ran into a scenario where I needed to script the installation of a site extension into an existing Azure Web App. Typically, I would use an [Azure ARM deployment to accomplish this](https://github.com/tomasr/webapp-appinsights) but in this particular situation that wasn't going to work.

I wanted to install the site extension that enables [Application Insights Monitoring of a live website](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-monitor-performance-live-website-now). After digging into existing arm templates, I found the name of that extension is `Microsoft.ApplicationInsights.AzureWebSites`. 

After searching for way too long, I eventually found PowerShell command I needed on a forum somewhere. I can't find it again so I'm posting this here in hopes that it will be easier for others to find in the future.

## Installing a site extension to an existing App Service Web App

{% codeblock %}
New-AzureRmResource -ResourceType "Microsoft.Web/sites/siteextensions" -ResourceGroupName MyResourceGroup -Name "MyWebApp/SiteExtensionName" -ApiVersion "2018-02-01" -Force
{% endcodeblock %}

For example, given a resource group named `Test`, a web app named `testsite` and a site extension named  `Microsoft.ApplicationInsights.AzureWebSites`.

{% codeblock %}
New-AzureRmResource -ResourceType "Microsoft.Web/sites/siteextensions" -ResourceGroupName "Test" -Name "testsite/Microsoft.ApplicationInsights.AzureWebSites" -ApiVersion "2018-02-01" -Force
{% endcodeblock %}

## Installing a site extension to a Web App Deployment Slot

The scenario I ran into was actually attempting to add this site extension to a deployment slot. When you create a deployment slot, it doesn't copy over any existing site extensions, which is a problem because when you swap your new slot to production, your new production slot ends up losing the site extensions that were in the old production slot.

{% codeblock %}
New-AzureRmResource -ResourceType "Microsoft.Web/sites/slots/siteextensions" -ResourceGroupName MyResourceGroup -Name "MyWebApp/SlotName/SiteExtensionName" -ApiVersion "2018-02-01" -Force
{% endcodeblock %}

Using the same example as above and  a slot named `Staging`:

{% codeblock %}
New-AzureRmResource -ResourceType "Microsoft.Web/sites/slots/siteextensions" -ResourceGroupName "Test" -Name "testsite/Staging/Microsoft.ApplicationInsights.AzureWebSites" -ApiVersion "2018-02-01" -Force
{% endcodeblock %}