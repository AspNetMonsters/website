title: Complex Custom Tag Helpers in MVC 6
date: 2015-12-28 17:00:00
categories:
  - MVC 6
  - Tag Helpers
tags:
  - ASP.NET MVC
  - ASP.NET 5
  - MVC 6
  - VS 2015
  - Tag Helpers
authorId: dave_paquette
---
In a previous blog post we talked about how to create [a simple tag helper](http://www.davepaquette.com/archive/2015/06/22/creating-custom-mvc-6-tag-helpers.aspx) in MVC 6. In today's post we take this one step further and create a more complex tag helper that is made up of multiple parts.

<!-- more -->

## A Tag Helper for Bootstrap Modal Dialogs

Creating a [modal dialog](http://getbootstrap.com/javascript/#static-example) in bootstrap requires some verbose html.

{% codeblock 'Bootstrap Modal' lang:html %}
<div class="modal fade" tabindex="-1" role="dialog">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title">Modal title</h4>
      </div>
      <div class="modal-body">
        <p>One fine body&hellip;</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary">Save changes</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->
{% endcodeblock %}

Using a tag helper here would help simplify the markup but this is a little more complicated than the Progress Bag example. In this case, we have HTML content that we want to add in 2 different places: the `<div class="modal-body"></div>` element and the `<div class="modal-footer"></div>` element. 

The solution here wasn't immediately obvious. I had a chance to talk to [Taylor Mullen](https://twitter.com/ntaylormullen) at the MVP Summit ASP.NET Hackathon in November and he pointed me in the right direction. The solution is to use 3 different tag helpers that can communicate with each other through the `TagHelperContext`.

Ultimately, we want our tag helper markup to look like this:

{% codeblock 'Bootstrap Modal using a Tag Helper' lang:html %}
<modal title="Modal title">
    <modal-body>
        <p>One fine body&hellip;</p>
    </modal-body>
    <modal-footer>
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary">Save changes</button>
    </modal-footer>
</modal>
{% endcodeblock %}

This solution uses 3 tag helpers: `modal`, `modal-body` and `modal-footer`. The contents of the `modal-body` tag will be placed inside the `<div class="modal-body"></div>` while the contents of the `<modal-footer>` tag will be placed inside the `<div class="modal-footer"></div>` element. The `modal` tag helper is the one that will coordinate all this.

## Restricting Parents and Children
First things first, we want to make sure that `<modal-body>` and `<modal-footer>` can only be placed inside the `<modal>` tag and that the `<modal>` tag can only contain those 2 tags. To do this, we set the `RestrictChildren` attribute on the modal tag helper and the `ParentTag` property of the `HtmlTargetElement` attribute on the modal body and modal footer tag helpers:


{% codeblock lang:csharp  %}
[RestrictChildren("modal-body", "modal-footer")]
public class ModalTagHelper : TagHelper
{
     //...
}

[HtmlTargetElement("modal-body", ParentTag = "modal")]
public class ModalBodyTagHelper : TagHelper
{
    //...
}

[HtmlTargetElement("modal-footer", ParentTag = "modal")]
public class ModalFooterTagHelper : TagHelper
{
    //...
}
{% endcodeblock %}

Now if we try to put any other tag in the `<modal>` tag, Razor will give me a helpful error message.

![Restrict children](http://www.davepaquette.com/images/restrict-children-razor-error.png "Restricting child elements in tag helpers")
 
## Getting contents from the children

The next step is to create a context class that will be used to keep track of the contents of the 2 child tag helpers.

{% codeblock lang:csharp %}
public class ModalContext
{
    public IHtmlContent Body { get; set; }
    public IHtmlContent Footer { get; set; }
}
{% endcodeblock %}

At the beginning of the ProcessAsync method of the Modal tag helper, create a new instance of `ModalContext` and add it to the current `TagHelperContext`:

{% codeblock lang:csharp %}
public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
{
    var modalContext = new ModalContext();
    context.Items.Add(typeof(ModalTagHelper), modalContext);
    //...
}
{% endcodeblock %}

Now, in the modal body and modal footer tag helpers we will get the instance of that `ModalContext` via the `TagHelperContext`. Instead of rendering the output, these child tag helpers will set the the `Body` and `Footer` properties of the `ModalContext`.

{% codeblock lang:csharp %}
[HtmlTargetElement("modal-body", ParentTag = "modal")]
public class ModalBodyTagHelper : TagHelper
{
    public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
    {
        var childContent = await output.GetChildContentAsync();
        var modalContext = (ModalContext)context.Items[typeof(ModalTagHelper)];
        modalContext.Body = childContent;
        output.SuppressOutput();
    }
}
{% endcodeblock %}

Back in the modal tag helper, we call `output.GetChildContentAsync()` which will cause the child tag helpers to execute and set the properties on the `ModalContext`. After that, we just set the output as we normally would in a tag helper, placing the `Body` and `Footer` in the appropriate elements.

{% codeblock "Modal tag helper" lang:html %}
public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
{
    var modalContext = new ModalContext();
    context.Items.Add(typeof(ModalTagHelper), modalContext);

    await output.GetChildContentAsync();

    var template =
$@"<div class='modal-dialog' role='document'>
<div class='modal-content'>
<div class='modal-header'>
<button type = 'button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button>
<h4 class='modal-title' id='{context.UniqueId}Label'>{Title}</h4>
</div>
<div class='modal-body'>";

    output.TagName = "div";
    output.Attributes["role"] = "dialog";
    output.Attributes["id"] = Id;
    output.Attributes["aria-labelledby"] = $"{context.UniqueId}Label";
    output.Attributes["tabindex"] = "-1";
    var classNames = "modal fade";
    if (output.Attributes.ContainsName("class"))
    {
        classNames = string.Format("{0} {1}", output.Attributes["class"].Value, classNames);
    }
    output.Attributes["class"] = classNames;
    output.Content.AppendHtml(template);
    if (modalContext.Body != null)
    {
        output.Content.Append(modalContext.Body); //Setting the body contents
    }
    output.Content.AppendHtml("</div>");
    if (modalContext.Footer != null)
    {
        output.Content.AppendHtml("<div class='modal-footer'>");
        output.Content.Append(modalContext.Footer); //Setting the footer contents
        output.Content.AppendHtml("</div>");
    }
    
    output.Content.AppendHtml("</div></div>");
}
{% endcodeblock %}

## Conclusion
Composing complex tag helpers with parent / child relationships is fairly straight forward. In my opinion, the approach here is much easier to understand than the "multiple transclusion" approach used to solve the same problem in Angular 1. It would be easy to unit test and as always, Visual Studio provides error messages directly in the HTML editor to guide anyone who is using your tag helper.

You can check out the full source code on the [Tag Helper Samples repo](https://github.com/dpaquette/TagHelperSamples).
 