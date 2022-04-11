
---
title: Monsters Weekly 246 -  Don't use OpenWriteAsync() ... probably
layout: post
tags: 
  - ASP.NET Core
authorId: monsters
date: 2022-04-04 08:00:00
categories:
  - Monsters Weekly
permalink: monsters-weekly\ep246
---

When it comes to performance, it's important to test our assumptions. In today's episode, David walks us through his failed attempt to optimize uploading files to blob storage. In this case, fewer allocations doesn't translate to better performance because there's a lot more going on inside BlockBlockClient's OpenWriteAsync() method than we thought.

https://docs.microsoft.com/en-us/dotnet/api/azure.storage.blobs.specialized.blockblobclient?view=azure-dotnet

Previous Episode
Performance of .NET JSON Serialization (#242) - https://youtu.be/w7ZfEVC76ho

<iframe width="702" height="395" src="https://www.youtube.com/embed/gRUEXiMRxKQ" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
