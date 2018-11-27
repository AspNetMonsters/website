---
layout: post
title: Blazor Geolocation updated
tags:
  - Blazor
categories:
  - Development
authorId: simon_timms
date: 2018-11-27 19:43:50
excerpt: Our package for integrating with the JavaScript GeoLocation APIs has been updated. 
---

There have been significant changes over the past year or so since we published our Geolocation API package for Blazor 0.3. Today we're pushing version 0.4 which updates the package for use with Blazor 0.7. 

There were quite a few changes to the JavaScript interop APIs since we last published the package - all of them really good. However they were, as you get with alpha software, breaking changes. We now do a better of of serializing payloads too.


## Usage
1) In your Blazor app, add the `AspNetMonsters.Blazor.Geolocation` [NuGet package](https://www.nuget.org/packages/AspNetMonsters.Blazor.Geolocation/)

```
Install-Package AspNetMonsters.Blazor.Geolocation -IncludePrerelease
```

1) In your Blazor app's `Startup.cs`, register the 'LocationService'.

```
public void ConfigureServices(IServiceCollection services)
{
    ...
    services.AddSingleton<LocationService>();
    ...
}
```

1) Now you can inject the LocationService into any Blazor page and use it like this:

```
@using AspNetMonsters.Blazor.Geolocation
@inject LocationService  LocationService
<h3>You are here</h3>
<div>
Lat: @location?.Latitude <br/>
Long: @location?.Longitude <br />
Accuracy: @location?.Accuracy <br />
</div>

@functions
{
    Location location;

    protected override async Task OnInitAsync()
    {
        location = await LocationService.GetLocationAsync();
    }
}
```