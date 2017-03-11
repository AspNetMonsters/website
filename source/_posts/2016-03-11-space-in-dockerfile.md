---
layout: post
title: Including a space in a path name in a Dockerfile
tags:
  - docker
categories:
  - docker   
authorId: simon_timms
date: 2017-03-09 17:36:36
---

I want so hard to like docker, but docker sure doesn't make it easy. Consider trying to copy a file in a dockerfile to a destination with a space in it. You're likely to get an error about how a path doesn't exist. If you Google this problem you get great adivce which basically adds up to "Don't put spaces or whitespace in your file paths". Thanks. 

There are two approaches to putting spaces or whitespace in that I've found. The first is to use a variable 

```
    ENV PATH_WITH_SPACE "c:/program files/"
    COPY thisisdumb.txt ${PATH_WITH_SPACE}
```

The other is to use this insane quasi-json syntax

```
    COPY ["thisisdumb.txt", "c:/program files/"]
```

Take your pick.