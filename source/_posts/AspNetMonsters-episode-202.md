
---
title: Monsters Weekly 202 -  Securing your Azure Functions
layout: post
tags: 
  - ASP.NET Core
authorId: monsters
date: 2021-03-01 08:00:00
categories:
  - Monsters Weekly
permalink: monsters-weekly\ep202
---

Azure Functions using Bearer token is clumsy. For some auth providers, you can enable App Service Authentication in the Azure Portal but that only works for the deployed version of your app which makes testing locally difficult and clumsy.

In this episode, we look at the AzureFunctions.OidcAuthentication library which makes it easy to validate JWT Tokens from a variety of OIDC providers like Auth0, Azure AD B2C, and Okta.

GitHub: https://github.com/AspNetMonsters/AzureFunctions.OidcAuthentication

NuGet: https://www.nuget.org/packages/AzureFunctions.OidcAuthentication/

TwoWeeksReady Sample App: https://github.com/HTBox/TwoWeeksReady

<iframe width="702" height="395" src="https://www.youtube.com/embed/XaS_p5D1llg" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
