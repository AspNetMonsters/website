
---
title: Monsters Weekly 242 -  Performance of .NET JSON Serialization
layout: post
tags: 
  - ASP.NET Core
authorId: monsters
date: 2022-03-02 08:00:00
categories:
  - Monsters Weekly
permalink: monsters-weekly\ep242
---

With the built in System.Text.Json serializer, serializing objects to and from JSON in .NET is FAST! However, the actual performance you get depends a bit on how you use it.  Using DotNetBenchmark, we take a look at some different patterns that can be used for serializing an object to and from a file on disk.

Benchmarking in .NET: https://benchmarkdotnet.org/articles/overview.html
JSON Serialization: https://docs.microsoft.com/en-us/dotnet/standard/serialization/system-text-json-how-to?pivots=dotnet-6-0

<iframe width="702" height="395" src="https://www.youtube.com/embed/w7ZfEVC76ho" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
