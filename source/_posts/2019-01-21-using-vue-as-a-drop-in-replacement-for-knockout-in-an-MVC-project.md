---
layout: post
title: Using Vue as a drop-in replacement for Knockout in an ASP.NET MVC project
tags:
  - ASP.NET
  - ASP.NET Core
  - Vue.js
  - Javascript
  - MVC
  - Knockout.js
categories:
 - Development
authorId: dave_paquette
originalurl: 'http://www.davepaquette.com/archive/2019/01/21/using-vue-as-a-drop-in-replacement-for-knockout-in-an-MVC-project.aspx'
date: 2019-01-21 06:57:12
excerpt: When maintaining existing ASP.NET applications, we often need to add some client side behaviour. I am a little surprised to see people reaching for Knockout in these scenarios but I think vuejs is a great alternative that is very much worth exploring.
---
So you're working an existing (brown-field) ASP.NET MVC application. The application's views are rendered server-side using Razor. Everything is working great and life is good. Suddenly, someone asks for a bit of additional functionality that will require some client side logic. Okay, no big deal. We do this all the time. The question though, is what framework/JavaScript library you will use to implement that client side functionality. 

The default MVC project templates already include jQuery, so you might use that. You'll probably end up writing a lot of code if you go down that path. Chances are, you will want to use a JavaScript framework that offers two-way data binding between the elements in the DOM to a your model data. 

I seems that for many people, [Knockout.js](https://knockoutjs.com/) is the default library to use in these scenarios. I won't get into the specifics but I think that Knockout is a little dated and that there are better options these days. If you want to dig into some of the issues with Knockout, you can read [Simon Timms' rant on the subject](https://westerndevs.com/a-discussion-on-knockout/).

## Vue.js
My fellow [ASP.NET Monster](https://aspnetmonsters.com) [James Chambers](http://jameschambers.com) recently strongly recommended I take a look at [Vue.js](https://vuejs.org). I had been meaning to give Vue a try for some time now and I finally had a chance to use it on a recent project. Let me tell you...I love it. 

I love it for a whole bunch of reasons. The [documentation](https://vuejs.org/v2/guide/) is great! It is super easy to get drop in to your existing project and it doesn't get in the way. For what I needed to do, it just did the job and allowed me to get on with my day. It is also designed to be "incrementally adoptable", which means you can start out with just using the core view layer, then start pulling in other things like routing and state management if/when you need them. 

## A simple example
I won't go into great detail about how to use Vue. If you want a full tutorial, head on over to the [Vue docs](https://vuejs.org/v2/guide/). What I want to show here is just how simple it is to drop Vue into an existing ASP.NET MVC project and add a bit of client side functionality. 

The simplest example I can think of is a set of cascading dropdowns. Let's consider a form where a user is asked to enter their Country / Province. When the Country is selected, we would expect the Province dropdown to only display the valid Provinces/States for the selected Country. That probably involves a call to an HTTP endpoint that will return the list of valid values.

{% codeblock lang:csharp %}
public class ProvinceLookupController : Controller
{
    public ActionResult Index(string countryCode)
    {
        var provinces = ProvinceLookupService.GetProvinces(countryCode);
        return Json(provinces, JsonRequestBehavior.AllowGet);
    }
}
{% endcodeblock %}

### Including Vue in your Razor (cshtml) view
The easiest way to include Vue on a particular Razor view is to link to the `vue.js` file from a CDN. You can add the following Script tag to your `scripts` section.

{% codeblock lang:html %}
@section scripts  {
    <script src="https://cdn.jsdelivr.net/npm/vue@2.5.22/dist/vue.js"></script>
}
{% endcodeblock %}

Be sure to [check the docs](https://vuejs.org/v2/guide/installation.html) to make sure you are referencing the latest version of Vue.

### Binding data to the our View
Now that you have included the core Vue library, you can start using Vue to bind DOM elements to model data. 

Start by defining a `Vue` object in JavaScript. You can add this in a new `<script>` tag in your `scripts` section.

{% codeblock lang:javascript %}
@section scripts  {
    <script src="https://cdn.jsdelivr.net/npm/vue@2.5.22/dist/vue.js"></script>

    <script type="text/javascript">
        var app = new Vue({
            el: '#vueApp',
            data: {
                selectedCountryCode: null,
                countries: [
                    { code: 'ca', name: 'Canada' },
                    { code: 'us', name: 'United States' }
                ]            
            }
        });
    </script>
}
{% endcodeblock %}

This `Vue` object targets the DOM element with id `vueApp` and contains some simple data. The currently selected country code and the list of countries. 

Now, back in the HTML part of your csthml, wrap the `form` in a div that has an `id="vueApp"`.

{% codeblock lang:html %}
<div id="vueApp">
    <!-- your form -->
</div>
{% endcodeblock %}

Next, bind the `<select>` element to the data in your `Vue` object. In Vue, data binding is done using a combination of custom attributes that start with `v-` and the double curly bracket (aka. Mustache) syntax for text. 

```html
<div class="form-group">
    @Html.LabelFor(model => model.CountryCode, new { @class = "control-label col-md-2" })
    <div class="col-md-10">
        <select id="CountryCode" name="CountryCode" class="form-control" 
                v-model="selectedCountryCode">
            <option v-for="country in countries" v-bind:value="country.code">
                {{ country.name }}
            </option>
        </select>
    </div>
</div>
```

Now, when you run the app, you should see a dropdown containing Canada and United States.

![Country Dropdown](https://www.davepaquette.com/images/vue/simple-country-dropdown.png)

### Adding functionality
Next, you will want to add some client side logic to get the list of valid provinces from the server whenever the selected country changes.

First, add an empty `provinces` array and a `selectedProvinceCode` property to the `Vue` object's data.

Next, add a method called `countryChanged` to the `Vue` object. This method will call the `ProvinceLookup` action method on the server, passing in the `selectedCountryCode` as a parameter. Assign the response data to the `provinces` array.

{% codeblock lang:javascript %}
var app = new Vue({
    el: '#vueApp',
    data: {
        selectedCountryCode: null,
        countries: [
            { code: 'ca', name: 'Canada' },
            { code: 'us', name: 'United States' }
        ],
        selectedProvinceCode: null,
        provinces: []
    },
    methods: {
        countryChanged: function () {
            $.getJSON('@Url.Action("Index", "ProvinceLookup")?countryCode=' + this.selectedCountryCode, function (data) {
                this.provinces = data;
            }.bind(this));
        }
    }
});
{% endcodeblock %}

Here I used jQuery to make the call to the server. In the Vue community, [Axios](https://github.com/axios/axios) is a popular library for making HTTP requests.

Back in the HTML, bind the `change` event from the country select element to the `countryChanged` method using the `v-on:change` attribute.

```html
<select id="CountryCode" name="CountryCode" class="form-control" 
        v-model="selectedCountryCode" v-on:change="countryChanged">
    <option v-for="country in countries" v-bind:value="country.code">
        {{country.name}}
    </option>
</select>
```

Now you can add a select element for the provinces.
```html
<div class="form-group">
    @Html.LabelFor(model => model.ProvinceCode, new { @class = "control-label col-md-2" })
    <div class="col-md-10">
        <select id="ProvinceCode" name="ProvinceCode" class="form-control"
                v-model="selectedProvinceCode">
            <option v-for="province in provinces" v-bind:value="province.Code">
                {{province.Name}}
            </option>
        </select>
    </div>
</div>
```

Voila! You now have a working set of cascading dropdowns.

![Country Dropdown](https://www.davepaquette.com/images/vue/country-province-dropdown.png)

### One last thing
You might want to disable the provinces dropdown whenever a request is being made to get the list of provinces for the selected country. You can do this by adding an `isProvincesLoading` property to the `Vue` object's data, then setting that property in the `countryChanged` method.

{% codeblock lang:javascript %}
var app = new Vue({
    el: '#vueApp',
    data: {
        selectedCountryCode: null,
        countries: [
            { code: 'ca', name: 'Canada' },
            { code: 'us', name: 'United States' }
        ],
        selectedProvinceCode: null,
        provinces: [],
        isProvincesLoading: false
    },
    methods: {
        countryChanged: function () {
            this.isProvincesLoading = true;
            $.getJSON('@Url.Action("Index", "ProvinceLookup")?countryCode=' + this.selectedCountryCode, function (data) {
                this.provinces = data;
                this.isProvincesLoading = false;
            }.bind(this));
        }
    }
});
{% endcodeblock %}

In your HTML, bind the `disabled` attribute to the `isProvincesLoading` property.
```html
<div class="form-group">
<select id="ProvinceCode" name="ProvinceCode" class="form-control"
        v-model="selectedProvinceCode"
        v-bind:disabled="isProvincesLoading">
    <option v-for="province in provinces" v-bind:value="province.Code">
        {{province.Name}}
    </option>
</select>
```

### Putting it all together

Here is the entire cshtml file.

```html
@{
    ViewBag.Title = "Location Settings";
}
@model Mvc5VueJsExample.Models.LocationSettingsModel

<h2>@ViewBag.Title.</h2>
<h3>@ViewBag.Message</h3>

<div id="vueApp">
    @using (Html.BeginForm("LocationSettings", "Home", FormMethod.Post, new { @class = "form" }))
    {
        <div class="form-group">
            @Html.LabelFor(model => model.CountryCode, new { @class = "control-label col-md-2" })
            <div class="col-md-10">
                <select id="CountryCode" name="CountryCode" class="form-control" 
                        v-model="selectedCountryCode" v-on:change="countryChanged">
                    <option v-for="country in countries" v-bind:value="country.code">
                        {{ country.name}}
                    </option>
                </select>
            </div>
        </div>

        <div class="form-group">
            @Html.LabelFor(model => model.ProvinceCode, new { @class = "control-label col-md-2" })
            <div class="col-md-10">
                <select id="ProvinceCode" name="ProvinceCode" class="form-control"
                        v-model="selectedProvinceCode"
                        v-bind:disabled="isProvincesLoading">
                    <option v-for="province in provinces" v-bind:value="province.Code">
                        {{province.Name}}
                    </option>
                </select>
            </div>
        </div>
        <button class="btn btn-primary" type="submit">Save</button>
    }

</div>
@section scripts  {
    <script src="https://cdn.jsdelivr.net/npm/vue@2.5.22/dist/vue.js"></script>

    <script type="text/javascript">
        var app = new Vue({
            el: '#vueApp',
            data: {
                selectedCountryCode: null,
                countries: [
                    { code: 'ca', name: 'Canada' },
                    { code: 'us', name: 'United States' }
                ],
                selectedProvinceCode: null,
                provinces: [],
                isProvincesLoading: false
            },
            methods: {
                countryChanged: function () {
                    this.isProvincesLoading = true;
                    $.getJSON('@Url.Action("Index", "ProvinceLookup")?countryCode=' + this.selectedCountryCode, function (data) {
                        this.provinces = data;
                        this.isProvincesLoading = false;
                    }.bind(this));
                }
            }
        });
    </script>
}
```

## Wrapping it up
I hope this gives you a taste for how easy it is to work with Vue. My current thinking is that Vue should be the default choice for client side frameworks in existing ASP.NET MVC apps.

NOTE: This example uses ASP.NET MVC 5 to illustrate that Vue can be used with brownfield applications. It would be just as easy, if not easier, to use Vue in an ASP.NET Core project.