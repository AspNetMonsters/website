title: What is Middleware Anyway?
categories:
  - Development
tags:
  - ASP.NET Core
  - ASP.NET MVC
date: 2016-03-15 9:45:00
authorId: simon_timms
---

If you spend a bit of time around the net ASP.NET Core there is a word you're going to hear thrown around a bunch and that is "middleware". I find middleware to be a confusing term which doesn't mean anything or perhaps means everything. Let's figure out what middleware means and what sorts of middleware we can slot into ASP.NET Core. 

<!-- more -->

Middleware sits between two pieces of software which talk with one another piece.  It is responsible for connecting the softwares together and may intercede to alter the communication or even intercept it. I know what you're thinking: that's a super vague definition, by that definition almost everything is middleware. Yep. See why I consider the term to be so confusing? The software we use these days is hugely abstracted and there are a lot of layers. Any of these layers in between are middleware. 

When I was a kid I had this game, Spellicoptor, which you had to boot right into. As far as I know it ran right on the hardware without that heavy weight Disk Operating System getting in the way. That was probably the last piece of software I used which wasn't middleware - it was certainly the most sneakily educational. 

For a web application we usually think of middleware as the software between the web server and the application responsible for returning HTML. In ASP.NET Core serving out static files such as .css files and images is performed by middleware. The prevents our, comparatively, complicated application pipeline from even running. This would be an example of middleware which intercepts requests and prevents it from even reaching the other layer.  You could also put authentication in the pipeline so that by the time a request hits you application code you can be confident that it is properly authenticated. In ASP.NET Core the middleware is implemented as a pipeline. This means that a request can pass though multiple pieces of middleware before it hits your code. In theory your code should not depend on a piece of middleware being there. However, in practice, we frequently do depend on something being there. Consider the case of authenticating a user: we frequently rely on the user name being set. However this user name could have been set by some authentication middleware or it could have been set by some mock development middleware which passes in a fake user. 

The pipeline in ASP.NET Core is a bi-directional one. This means that each piece of middleware has two opportunities to intervene in the request processing: when the request comes in and when the response goes out. So your middleware can alter the data your application gets or it can alter the data coming from your application. 

When should you use middleware? I like to think of it as something of a cross cutting concern. If there is something you want to before or after a large number of requests and it isn't part of the core logic of the application then middleware might be the place for you. Pay attention to the "core logic" part of that sentence. If your application has some cross cutting concern but is really part of the logic of the application - say sending notification e-mail when anybody deletes an item (via the DELETE HTTP verb) then this shouldn't be in the middleware. However if you want to log requests then middleware could be a great place. 

Middleware can take the place of what was one written as modules for IIS. Moving this functionality to middleware which knows how to talk OWIN means that your application is less coupled to IIS. It may be difficult to imagine a world where IIS is not the de facto tool for running ASP.NET applications but I suspect there are a great number of sites and applications which don't need the power of a full IIS stack behind them. 

I wrote ASP.NET applications for the better part of a decade and I wrote modules perhaps 3 times in all those years. I just didn't see the advantage to using them. However others such as Dave and James assure me that in the wider world modules were used quite heavily. So this paragraph was going to be about how you'll likely never need to write middleware but at this juncture I honestly don't know where everything will end up. You might be writing middleware for 90% of your code. 

I'm excited to see where the middleware for ASP.NET ends up. There is already some pretty nifty tooling in place providing custom error messages to help people out with very descriptive errors. I'd love to hear about your ideas for middleware in the comments below.
