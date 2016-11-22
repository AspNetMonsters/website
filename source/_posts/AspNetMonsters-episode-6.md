---
title: The Monsters Weekly - Episode 6 'JSON Data and The Options Pattern' 
layout: post
featureImage: logo_579.png
tags: 
  - ASP.NET Core
  - Configuration
  - ASP.NET Core MVC 
authorId: monsters
date: 2016-02-11 06:00:00
categories:
  - Monsters Weekly
permalink: monsters-weekly\ep6
---

Now that we've wrapped our heads around the basics of configuration in ASP.NET Core, let's start to take control of our appliaction settings. In this episode, we're looking at a pattern and leveraging the framework to get strongly-typed settings as objects at runtime. 

<!-- more -->

<iframe src="https://channel9.msdn.com/Series/aspnetmonsters/Episode-6-JSON-Data-and-The-Options-Pattern/player" width="640" height="360" allowFullScreen frameBorder="0"></iframe>

So, the problem with configuration is that in the past it's not really been that great to work with. In ASP.NET there are wholesale changes and, in our last video, we looked at how the runtime gives better options for storage and mechanisms for loading data. Here, we'll look at structured storage and strongly-typed config.

One you have your data loaded wouldn't it be grand if you could access it through typical objects? The new options pattern in Core MVC gives us ability, mapping structured configuration into proper objects that we can inject into our classes and use at runtime.

The production code for this video is N0.
