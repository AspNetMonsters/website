---
layout: post
title: Azure Processor Limits
authorId: simon_timms
date: 2020-11-05 15:00
originalurl: https://blog.simontimms.com/2020/11/05/2020-11-05-processor-limits/
---

Ran into a fun little quirk in Azure today. We wanted to allocate a pretty beefy machine, an M32ms. Problem was that for the region we were looking at it wasn't showing up on our list of VM sizes. We checked and there were certainly VMs of that size available in the region we just couldn't see them. So we ran the command 

```
az vm list-usage --location "westus" --output table
```

And that returned a bunch of information about the quota limits we had in place. Sure enough in there we had 

```
Name                               Current Value   Limit
Standard MS Family vCPUs           0               0
```

We opened a support request to increase the quota on that CPU. We also had a weirdly low limit on CPUs in the region 

```
Total Regional vCPUs               0               10
```

Which support fixed for us too and we were then able to create the VM we were looking for. 