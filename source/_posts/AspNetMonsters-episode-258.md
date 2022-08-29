
---
title: Monsters Weekly 258 -  Enforce Node Versions with package.json and GitHub Actions
layout: post
tags: 
  - ASP.NET Core
authorId: monsters
date: 2022-08-29 08:00:00
categories:
  - Monsters Weekly
permalink: monsters-weekly\ep258
---

If you want your node/npm based project to use a specific version of Node and NPM, it's best to enforce that using the engines setting in package.json. In today's episode, we do just that with the ASP.NET Monsters blog repo and even configure GitHub Actions to install the correct version onf Node based on the engines specified in package.json.

Changes we made to package.json and our GitHub Actions Workflow:
https://github.com/AspNetMonsters/website/pull/92/files

Volta for integrating with your shell https://volta.sh/

<iframe width="702" height="395" src="https://www.youtube.com/embed/iP6rxmZgbDA" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
