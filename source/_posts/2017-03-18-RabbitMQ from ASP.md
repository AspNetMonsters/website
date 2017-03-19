---
layout: post
title: Getting Started with RabbitMQ in ASP.NET
tags:
  - .net
  - RabbitMQ
categories:
  - messaging   
authorId: simon_timms
date: 2017-03-18 01:36:36
---

In the last post we looked at how to set up RabbitMQ in a Windows container. It was quite the adventure and I'm sure it was woth the time I invested. Probably. Now we have it set up we can get to writing an application using it. 

A pretty common use case when building a web application is that we want to do some background processing which takes longer than we'd like to keep a request open for. Doing so would lock up an IIS thread too, which ins't optimal. In this example we'd like to make our user creation a background process.

To start we need a command which is just a plain old CLR object

```
public class AddUser
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Password { get; set; }
    public string EmailAddress { get; set; }
}
```

That all looks pretty standard. In our controller, we'll just use the handy UserCreationSender

```
public class HomeController : Controller
{
    IUserCreationSender _userCreationSender;
    public HomeController(IUserCreationSender userCreationSender)
    {
        _userCreationSender = userCreationSender;
    }

    public IActionResult Index()
    {
        _userCreationSender.Send("simon", "tibbs", "stimms@gmail.com");
        return View();
    }
}
```

There that was easy. In our next post, we'll... what's that? I've missed actually showing any implementation. Fair point, we can do that. 

```
public void Send(string firstName, string lastName, string emailAddress)
{
    var factory = new ConnectionFactory()
    {
        HostName = "172.22.144.236",
        Port = 5672,
        UserName = "guest",
        Password = "guest"
    };
    using (var connection = factory.CreateConnection())
    using (var channel = connection.CreateModel())
    {
        channel.QueueDeclare(queue: "niftyqueue",
                                durable: false,
                                exclusive: false,
                                autoDelete: false,
                                arguments: null);

        var command = new AddUser
        {
            FirstName = firstName,
            LastName = lastName,
            EmailAddress = emailAddress,
            Password = "examplePassword"
        };
        string message = JsonConvert.SerializeObject(command);
        var body = Encoding.UTF8.GetBytes(message);

        channel.BasicPublish(exchange: "",
                                routingKey: "niftyqueue",
                                basicProperties: null,
                                body: body);
    }
}
```

Values here are hard coded which we don't want to do usually, check out https://aspnetmonsters.com/2016/01/Configuration-in-ASP-NET-Core-MVC/ for how to pull in configuration. Ignoring that we start by creating a conneciton factory with connection information for RabbitMQ. We then create a new queue (or ensure that it already exists) called "niftyqueue". There are some other parameters in the queue creation we can get into in a future article. 

Next we'll create an AddUser command and serialize it to JSON using good old Json.net then get the bytes. Rabbit messages contain a byte array so we have to do a tiny bit of leg work to get our CLR object into a form usable by the transport. JSON is the standard for everything these days so we'll go with the flow. In a real system you might want to investigate Protocol Buffer or something else. 

Finally we perform a basic publish, sending our message. The Rabbit management site provides a super cool view of the messages being published on it

![The dashboard](http://i.imgur.com/odiUxPh.png)

How cool is that? Man I like real time charts. 

Shoving messages into the bus is half the equation, the other half is getting it out again. We want to have a separate process handle getting the message. That looks quite similar to the message sending.

```
public static void Main(string[] args)
{
    Console.WriteLine("starting consumption");
    var factory = new ConnectionFactory()
    {
        HostName = "172.22.144.236",
        Port = 5672,
        UserName = "guest",
        Password = "guest"
    };
    using (var connection = factory.CreateConnection())
    using (var channel = connection.CreateModel())
    {
        channel.QueueDeclare(queue: "niftyqueue",
                                durable: false,
                                exclusive: false,
                                autoDelete: false,
                                arguments: null);

        var consumer = new EventingBasicConsumer(channel);
        consumer.Received += (model, ea) =>
        {
            var body = ea.Body;
            var message = Encoding.UTF8.GetString(body);
            var deserialized = JsonConvert.DeserializeObject<AddUser>(message);
            Console.WriteLine("Creating user {0} {1}", deserialized.FirstName, deserialized.LastName);
        };
        channel.BasicConsume(queue: "niftyqueue",
                                noAck: true,
                                consumer: consumer);

        Console.WriteLine("Done.");
        Console.ReadLine();
    }
}
```

Again we create the factory and the queue (some opportunity there for refactoring, me thinks). Next we start up an EventingBasicConsumer on top of the channel. There are a couple of different ways to consume messages none of which I really love. The eventing model seem the leas objectionable. You simply assign a delegate to the event handler and it will fire when a message is recieved. 

In the next post I'll start taking a look at how we can layer [MassTransit](http://masstransit-project.com/), a .NET message bus, on top of raw RabbitMQ. The result is a much more pleasant experience then simply hammering together raw RabbitMQ. 

