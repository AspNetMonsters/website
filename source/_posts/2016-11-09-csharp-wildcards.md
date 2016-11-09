---
layout: post
title: C# Wildcard Variables
categories:
  - C# 
date: 2016-11-09 17:00:00
tags:
  - C#
excerpt: Wildcard variables in C# are up for discussion for inclusion in C# 7 or some later version. They are a useful construct taken from functional languages like Haskel.
authorId: simon_timms
originalurl: http://blog.simontimms.com/2016/11/09/c-wildcardsdiscardsignororators/
---

There is some great discussion going on about including discard variables in C#, possibly even for the C# 7 timeframe. It is so new that the name for them is still up in the air. In Haskel it is called a wildcard. I think this is a great feature which is found in other languages but isn't well known for people who haven't done funcitonal programming. The C# language has been sneaking into being a bit more functional over the last few releases. There is support for lambdas and there has been a bunch of work on immutability. Let's take a walk through how wildcards works. 

Let's say that we have a function which has a number of output paramaters:

```
void DoSomething(out List<T> list, out int size){}
```

Ugh, already I hate this method. I've never liked the out syntax because it is wordy. To use this function you would have to do

```
List<T> list = null;
int size = 0;
DoSomething(out list, out size);
```

There is some hope for that syntax in C# 7 with what I would have called inline declaration of out variables but is being called "out variables". The syntax would look like 

```
DoSomething(out List<T> list, out int size);
```

This is obviously much nicer and you can read a bit more about it at
https://blogs.msdn.microsoft.com/dotnet/2016/08/24/whats-new-in-csharp-7-0/

However in my code base perhaps I don't care about the size parameter. As it stands right now you still need to declare some variable to hold the size even if it never gets used. For one variable this isn't a huge pain. I've taken to using the underscore to denote that I don't care about some variable.  

```
DoSomething(out List<T> list, out int _);
//make use of list never reference the _ variable
```

The issue comes when I have some funciton which takes many parameters I don't care about. 

```
DoSomething(out List<T> list, out int _, out float __, out decimal ___);
//make use of list never reference the _ variables
```

This is a huge bit of uglyness because we can't overload the _ variable so we need to create a bunch more variables. It is even more so ugly if we're using tuples and a deconstructing declaration (also part of C# 7). Our funciton could be changed to look like 

```
(List<T>, int, float, decimal) DoSomething() {}
```

This is now a function which returns a tuple containing everything we previously had as out prameters. Then you can break this tuple up using a deconstructing declaration.

```
(List<T> list, int size, float fidelity, decimal cost) = DoSomething();
```

This will break up the tuple into the fields you actually want. Except you don't care about size, fidelity and cost. With a wildcard we can write this as 

```
(List<T> list, int _, float _, decimal _) = DoSomething();
```

This beauty of this wildcard is that we can use the same wildcard for each field an not worry about them in the least. 

I'm really hopeful that this feature will make it to the next release. 