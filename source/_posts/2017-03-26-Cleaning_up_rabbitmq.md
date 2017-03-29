---
layout: post
title: Cleaning up MassTransit Registration
tags:
  - rabbitmq
  - masstransit
categories:
  - messaging   
authorId: simon_timms
date: 2017-03-26 01:36:36
---

This blog is part of a series exploring RabbitMQ and MassTransit. Previous episodes are available at

 - [Creating a RabbitMQ Container](https://aspnetmonsters.com/2017/03/2017-03-09-rabbitmq/)
 - [Getting Started with RabbitMQ in ASP.NET](https://aspnetmonsters.com/2017/03/2017-03-18-RabbitMQ%20from%20ASP/)
 - [MassTransit on RabbitMQ in ASP.NET Core](https://aspnetmonsters.com/2017/03/2017-03-24-masstransit1/)

In the last episode I did a lot of handwaving over the mess I made of configuration. There were hard coded values all over the place. In this article we'll clear up some of the mess we made. 

<!-- more -->

The first problem was the IP address of the RabbitMQ endpoint. This can change every time you launch a docker image. I played with a few ways to get the address. You can extract the address from the running docker instance by running 

```
docker inspect --format '{{ .NetworkSettings.Networks.nat.IPAddress }}' practical_jones
```

In this case `practical_jones` was the name of both the container and a tedious Lifetime movie about a Welsh woman who breaks free of her monotnous life after winning a trip to Indonesia. 

This can be added as an environmental variable for consumption by ASP.NET Core. It does mean that you need to remember to do that every time you start up a docker container for your project. I could see this being a real pain but it is basically the best option we have right now. 

I asked noted Docker dude Dr. Gabriel Schenker about it and he suggested just forwarding the port using `docker run -p 5672:5672`

<blockquote class="twitter-tweet" data-conversation="none" data-cards="hidden" data-partner="tweetdeck"><p lang="en" dir="ltr"><a href="https://twitter.com/stimms">@stimms</a> you can expose the rabbit mq port to the host and then you can access it on localhost</p>&mdash; Gabriel N. Schenker (@gnschenker) <a href="https://twitter.com/gnschenker/status/846089009537470465">March 26, 2017</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

However, turns out that networking in Windows containers sucks and that you can't use the loopback yet to talk to containers. Read all about it on Elton Stoneman's blog https://blog.sixeyed.com/published-ports-on-windows-containers-dont-do-loopback/. So basically, the best solution is to update the environment variable or put the value in a configuration file. 

Next thing to fix is how we get the values into our application. This can be done with strongly typed configuration. Create a class with our configuration values

```
public class RabbitMQOptions
{
    public string IPAddress { get; set; }
    public string PortNumber { get; set; } = "5672";
    public string UserName { get; set; } = "guest";
    public string Password { get; set; } = "guest";
}
```

Now we can load this into our application in the startup by adding 

```
services.Configure<RabbitMQOptions>(Configuration.GetSection("RabbitMQ"));
```

This gets us the values into the configuration which we can access from our Bus registration lambda

```
builder.Register(c =>
{
    var options = c.Resolve<IOptions<RabbitMQOptions>>().Value;
    return Bus.Factory.CreateUsingRabbitMq(sbc => 
        sbc.Host(options.IPAddress, "/", h =>
        {
            h.Username(options.UserName);
            h.Password(options.Password);
        })
    );
})
```

The second part of our poor set up is awkward way to get the send endpoint inside of the controller. It can be cleaned up with a handy `EndpointProvider` whose role it is to manage the end point address

```
public class EndpointProvider : IEndpointProvider
{
    IOptions<Configuration.RabbitMQOptions> options;
    public EndpointProvider(IOptions<Configuration.RabbitMQOptions> options)
    {
        this.options = options;
    }
    public Uri GetEndpoint()
    {
        return new Uri($"rabbitmq://{options.Value}/MassTransitDemo1");
    }
}
```

This is a simple one which maps a single end point. End points can handle messages of many different types so you will likely need few of them, one per recieving process in most cases. The provider here could be extended to use some logic to determine the endpoint, perhaps the message type would be a good example of a determinant. 

This can now be used in the controller like so 

```
public class HomeController : Controller
{
    IBus _bus;
    IEndpointProvider _endpointProvider;
    public HomeController(IBus bus, IEndpointProvider endpointProvider)
    {
        _endpointProvider = endpointProvider;
        _bus = bus;
    }
    public async Task<IActionResult> Index()
    {
        var addUserEndpoint = await _bus.GetSendEndpoint(_endpointProvider.GetEndpoint());
        await addUserEndpoint.Send<AddUser>(new
        {
            FirstName = "Simon",
            LastName = "Tibbs",
            EmailAddress = "stimms@example.com",
            Password = "A wicked secret password"
        });
        return View();
    }
}
```

With our scattering of magic string cleared up we can start looking at more advanced scenarios like pub/sub in our next post. 