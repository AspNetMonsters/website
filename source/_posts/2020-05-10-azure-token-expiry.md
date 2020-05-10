---
layout: post
title: Azure App Configuration Expired Token
tags: 
    - azure
authorId: simon_timms
date: 2020-05-10 10:00
originalurl: https://blog.simontimms.com/2020/05/10/2020-05-10-azure-token-expired/

---

I moved one of the products I help maintain over to using Azure's excellent [App Configuration](https://docs.microsoft.com/en-us/azure/azure-app-configuration/overview) tool. But one of the other developers on the team started to have problems with it. When loading the configuration in Azure Functions they got an error: `The access token has expired`
<!-- more -->
![An expired token](/images/tokenexpiry/image.png)

We double checked to make sure that they were using the correct keys and they were. The keys worked on my computer so something was a foot. The key was that the token was reporting itself as expired. As it turned out the clock on the dev's computer was out by an hour so it was minting tokens which were already expired or not yet valid. Fixing the clock skew fixed the problem.