title: Tips for Speeding Up Visual Studio
layout: post
tags:
  - Visual Studio 2015
categories:
  - Development
authorId: james_chambers
originalUrl: 'http://jameschambers.com/2016/02/building-your-project-should-be-pretty-quick/'
date: 2016-02-11 22:12:54
---
People, this is 2016. If you're waiting on your project to build or feel like your IDE is sluggish, it's time to inventory and make sure you have the optimal configuraiton for development rig. Let's talk quickly about the things that make your machine go fast (or slow) and some simple tweaks that can get your builds moving along more quickly.

![Launching VS in Safe Mode](https://jcblogimages.blob.core.windows.net:443/img/2016/02/safemode.png)

<!-- more -->

In a recent ASP.NET Community Standup, the team quickly ran through a list of things that you can do to make sure that your environment is in check for building as quickly as possible and running a stable version of Visual Studio.<!-- more --> These tips included:
 - Start Visual Studio in Safe Mode
 - Run on an SSD
 - Exclude dev tools and folders from anti-virus software
 - Use a RAM disk for your code
 - Figure out _what is actually causing your grief_ 
 - Disabling features


## Start Visual Studio in Safe Mode

This is an easy tip to try out and has no impact on your normal dev environment. It's not as destructive as, say, resetting Visual Studio and nuking all your plugins. Just open a Visual Studio command prompt (I typically do so as admin) and launch the IDE like so:

`devenv /SafeMode`

Many times extensions crap out and slow you down. There are some great ones out there, so I would never suggest removing them all. I have a love-hate relationship with ReSharper and often disable it, especially when I'm travelling and can't be plugged in to step up my CPU speed.

## Run on an SSD

This was a game changer for me: it was a tough pill to swallow, but going from hundreds of gigs of space down to ~40 on my first SSD was so worth it. Over the last couple of years I've upgraded along the way and currently have two that I sit on (on my two different rigs).

> If you can hear your hard drive, you are going to be an unhappy individual in your life. - Scott Hanselman

I recommend [this one](http://www.amazon.ca/gp/product/B00OAJ412U/ref=as_li_qf_sp_asin_il_tl?ie=UTF8&camp=15121&creative=330641&creativeASIN=B00OAJ412U&linkCode=as2&tag=chasthelist-20) or [this one](http://www.amazon.ca/gp/product/B00OBRFFAS/ref=as_li_qf_sp_asin_il_tl?ie=UTF8&camp=15121&creative=330641&creativeASIN=B00OBRFFAS&linkCode=as2&tag=chasthelist-20) and can vouch for your `_happy++;` should you make the switch. The thing I love about the Samsungs is the little Magician software they bundle with the drives so that you can easily drop your HDD and move all your data over to the new, faster kit.

## Exclude Your Tooling and Code From Anti-Virus Software

I want to make it perfectly clear that while I agree with this tip and do this myself, it's not one that you should take lightly as you're removing a layer of protection from your computer. So don't do it. Unless you want to run faster, in which case, exclude these guys from your real-time scan:

 - devenv
 - msbuild
 - your code folder
 
I'm running McAfee, which looks like this when you drill in from the dashboard:

![Excluding Tools from Virus Scans](https://jcblogimages.blob.core.windows.net:443/img/2016/02/anti-virus-exclude.PNG)

Pretty easy to setup, and you'll get some of your day back. But I told you not to do it.

## Use a RAM Disk For Your Code

There isn't enough gain for me to recommend this one. I actually tried it a couple of years ago when I got my first SSD and the speed wasn't greatly improved. On top of that, it required slicing out RAM, running scripts to mirror or copy over the code and ran the risk of data loss if the computer freezes. If you can drop $100 or less on an SSD, it's just not worth it to run a RAM disk. Some folks argue that it's 10x the speed (or more) than an SSD, but I wasn't sold on that sales pitch.

_That said_, if you're still on an HDD, I can confirm that running on a RAM disk will be a Godsend. Most recently I have used [this one](http://www.ltr-data.se/opencode.html/) but I haven't tried it on Win 10. There's also a commercial one that [a friend of mine swears by](http://www.superspeed.com/desktop/ramdisk.php). 

## Figure Out What is Actually Causing Your Grief

There's a great tool that most devs I know run on their machine, the much-improved version of process monitor from [sysinternals](https://technet.microsoft.com/en-us/sysinternals/processmonitor.aspx):

![Process Monitor](https://jcblogimages.blob.core.windows.net:443/img/2016/02/sysinternals-procmon.PNG)

SIPM will reveal everything that gets logged out by any processes that are running, from disk reads/writes to thread allocation to network activity and more. If you ever figured there wasn't a lot to do when you "just wanted to build", you'll be quite surprised when you build your project and see tens of thousands of events drop in milliseconds. Computers are awesome.

Simply start up process monitor, then start Visual Studio and watch for events. You can start honing in and finding what is causing your grief. I find the best way to get at things is by excluding the bits that you know are not the problem, like explorer.exe, and then honing in by excluding things like reading from the registry.  

## Disabling Features

Things like IntelliTrace offer great benefits, but if you're in power-saver mode you're going to find yourself crying for processor cycles. I notice when travelling, when I often find myself not plugged in, that builds can drag on and debugging can be brutal if you have certain features on. Check to see if you have anything running that you don't need. 

## Straight from the Horse's...

You can watch the original video below (jumpt to the 36:00 mark), or hit it out on the [YouTubes](https://youtu.be/niCDYdrCOu0?t=32m6s).

<iframe width="560" height="315" src="https://www.youtube.com/embed/niCDYdrCOu0" frameborder="0" allowfullscreen></iframe>

A huge thanks to the leaders there on the ASP.NET team who do the weekly standup and share their insight in this area. 

## How About You?

Do you have any tips for others using Visual Studio? Any tricks you think have helped you reach performance nirvana? Please share your thoughts below!

Happy Coding!