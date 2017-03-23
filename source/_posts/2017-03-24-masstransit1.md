---
layout: post
title: MassTransit on RabbitMQ in ASP.NET Core
tags:
  - rabbitmq
  - masstransit
categories:
  - messaging   
authorId: simon_timms
date: 2017-03-22 01:36:36
---

In the last post, we created an application which can send tasks to a background processor. We did it directly with RabbitMQ which was a bit of a pain. We had to do our own wiring and even our own serialization. Nobody wants to do that for any sort of sizable application. Wiring would be very painful on a large scale.

There are a couple of good options in the .NET space which can be layered on top of raw queues. NServiceBus is perhaps the most well know option. There is, of course, a cost to running NServiceBus as it is a commercial product. In my mind the cost of NServiceBus is well worth it for small and medium installations. For large installations I'd recommend building more tightly on top of cloud based transports, but that's a topic for another blog post. 

<!-- more -->

MassTransit is another great option. Comparing the two is beyond the scope of this article but there are some [good](http://stackoverflow.com/questions/13647423/nservicebus-vs-masstransit) [articles](http://looselycoupledlabs.com/2014/11/masstransit-versus-nservicebus-fight/) on that already. MassTransit layer an actual messaging layer on top of either RabbitMQ or Azure Service Bus which means that is provides for serialization routing. 

We should, perhaps, take a moment here to talk about the two types of messages we use in a message driven system. The first is a command. Commands are instructions to perform some action. They are named in the imperative such as 

- AddUser
- DeleteAccount
- PlantFlowers

Commands can be validated and rejected by a command handler if they are invalid. A command can be sent from multiple points in the code but is consumed by a single endpoint, consumer or command handler. The message bus handles the association of commands and command handlers.

The second type of message is an event. It is a notificaiton that something has happened. It cannot be rejected by a handler because it is something which has already happened - you can't change the past. Typically, they are named in the past tense

- UserAdded
- AccountDeleted
- FlowersPlanted

An event is raised in a single location but may be consumed by many services. Events are typically raised as a result of a command, however they need not be 1:1. Consider handling the `AddUser` command: during the processing we might raise a number of events `UserAdded`, `UserAddedToDatabase`, `UserAddedToSearchEngine`, `WelcomeEmailSent`. Events provide a powerful mechanism for decoupling components. Parts of the code base interested in the `UserAdded` event can subscribe to the messages without the add user consumer knowing about them. This cleanly splits responsibilities. 

Returning to MassTransit we will create an example web application which sends commands and a console application which consumes messages. Let's start start building the message producer first. A number of packages will need to be added to the project.json

```
    "MassTransit": "3.5.5",
    "MassTransit.RabbitMQ": "3.5.5",
    "Common": "1.0.0-*",
    "Autofac.Extensions.DependencyInjection": "4.0.0",
```

The MassTransit and MassTransit packages provide the backbone of MassTransit and the bindings to RabbitMQ. Autofac will be used to handle the dependency injection of complex objects. The build in DI system might be sufficient but I have a preference for Autofac. Finally, the Common project contains the message interfaces. MassTransit will hydrate new messages for us based on interfaces so we don't actually have to construct concrete classes. The nice part is that this effectivly enables multiple inheritance. 

In our example, we're going to use an AddUser message. You can tell from its name that it is a command.

```
public interface AddUser
{
    string FirstName { get; set; }
    string LastName { get; set; }
    string Password { get; set; }
    string EmailAddress { get; set; }
}
```

The bus can now be configured in our StartUp.cs up class.

```
public IServiceProvider ConfigureServices(IServiceCollection services)
{
    // Add framework services.
    services.AddApplicationInsightsTelemetry(Configuration);
    services.AddMvc();
  
    var builder = new ContainerBuilder();
    builder.Register(c =>
    {
        return Bus.Factory.CreateUsingRabbitMq(sbc => 
            sbc.Host("172.22.149.120", "/", h =>
            {
                h.Username("guest");
                h.Password("guest");
            })
        );
    })
    .As<IBusControl>()
    .As<IBus>()
    .As<IPublishEndpoint>()
    .SingleInstance();
    builder.Populate(services);
    container = builder.Build();
    
    // Create the IServiceProvider based on the container.
    return new AutofacServiceProvider(container);
}
```

Here we set up the the bus and give it the rabbitMQ connection settings. I hard coded the connection information here but that's bad. You can easily access the Configruation and pull values from that, we'll do that in another post

In the configure method we can resolve the bus control and start it up

```
var bus = container.Resolve<IBusControl>();
var busHandle = TaskUtil.Await(() => bus.StartAsync());
```

It is also polite to shut down the bus one application exit. This was difficult in previous versions of ASP.net/WebAPI but it is now simple. We just add an `IApplicationLifetime lifetime` to the Configure method and then 

```
lifetime.ApplicationStopping.Register(() => busHandle.Stop());
```

Now we can get to actually sending a message. We'll do that right from the controller, because we roll that way. In something like NServiceBus 5 we send messages by writing them to the bus directly. In NSB 6 this changed to use an endpoint, which is a bus in all but name. MassTransit also has a concept of an endpoint and, I'd say, it is closer to what I think of as an endpoint than what NSB uses. An endpoint is a destination to send a message. We can ask the MassTransit bus object to generate us an endpoint. 

```
IBus _bus;
public HomeController(IBus bus)
{
    _bus = bus;
}
public async Task<IActionResult> Index()
{
    var addUserEndpoint = await _bus.GetSendEndpoint(new Uri("rabbitmq://172.22.149.120/AddUser1"));
```

Again you can see that we have a bit of a reliance on some hard coded strings. We'll look at addressing some of this in a later post. For now it sufices to observe that we send to a specific address. Once we have the endpoint we can send the message

```
 await addUserEndpoint.Send<AddUser>(new 
{
    FirstName = "Simon",
    LastName="Tibbs",
    EmailAddress="stimms@gmail.com",
    Password = "A wicked secret password"
});
```

That's enough to get a message into the RabbitMQ. We can now set up a message consumer on the other end. For this we'll stand up a new command line program, shove a bus in it and hook up a consumer. Sounds like a lot but it is actually pretty simple. In our program entry point, typically Program.cs we build the bus.

```
var busControl = Bus.Factory.CreateUsingRabbitMq(cfg =>
{
    var host = cfg.Host(new Uri("rabbitmq://172.22.149.120/"), h =>
    {
        h.Username("guest");
        h.Password("guest");
    });

    cfg.ReceiveEndpoint(host, "AddUser1", e =>
    {
        e.Consumer<AddUserConsumer>();
    });
});
busControl.Start();
```

Notice that we add a consumer endpoint called AddUserConsumer. A consumer is a piece of code which is executed when a matching message is received. In this case all we want to do is log out to the console

```
public class AddUserConsumer : IConsumer<AddUser>
{
    public Task Consume(ConsumeContext<AddUser> context)
    {
        Console.WriteLine($"Adding user {context.Message.FirstName} {context.Message.LastName}");
        return Task.CompletedTask;
    }
}
```

The AddUserConsumer's Consume method will be called by MassTransit any time that it is fed a message by RabbitMQ. This method of wiring up handler or consumers is much cleaner and more scalable than what we saw with using raw RabbitMQ.

Another thing you might have noticed with the MassTransit code is that it is all asynchronous. This is a nice feature, especially because the handler contexts will tend to have asynchronous things happening in the: writing to a database, sending http requests and so forth. 

The title of this post mentions .NET Core but unfortunately MassTransit and RabbitMQ don't curently run on .NET Core so this needs to be run on full framework. I suspect that when netstandard 2 and .NET Core 2 come online later in 2017 it will be possible to run using that, possibly even across platforms. 

In the next post we'll look at including DI to wiring of our consumers and also clean up some of the hard coded strings we have scattered about. 