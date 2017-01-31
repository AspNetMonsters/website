
---
title: The Monsters Weekly - Episode 92 -  Saving CPU Cycles with Static Resource Hashes
layout: post
featureImage: logo_579.png
tags: 
  - ASP.NET Core
authorId: monsters
date: 2017-01-31 04:30:00
categories:
  - Monsters Weekly
permalink: monsters-weekly\ep92
---

<p>In today's episode, Monster Dave prototypes an approach to generating static resource URLs to potentially improve the performance of an ASP.NET Core application. Borrowing ideas from a recent blog post by the Facebook engineering team.</p><p>&nbsp;</p><p>First, we create a tag helper to generate static resource URLs based on a hash of the file's contents. Next, we write some custom middleware to rewrite those new URLs to the actual file and to always return 304 not-modified for all conditional requests.</p><p>The Blog Post: <a href="https://code.facebook.com/posts/557147474482256" target="_blank">https://code.facebook.com/posts/557147474482256</a></p><p><a class="twitter-follow-button" href="https://twitter.com/aspnetmonsters">Follow @aspnetmonsters</a></p><p>NOTE: This video is intended to explore the concepts outlined in the blog post above and are not be suited for production use.</p> 

<!--more-->
<iframe src='https://channel9.msdn.com/Series/aspnetmonsters/ASPNET-Monsters-92-Saving-CPU-Cycles-with-Static-Resource-Hashes/player' width='640' height='360' allowFullScreen frameBorder='0'></iframe>
