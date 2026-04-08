---
layout: null
sitemap: false
---

{% assign counter = 0 %}
var documents = [{% for page in site.pages %}{% if page.url contains '.xml' or page.url contains 'assets' or page.url contains 'category' or page.url contains 'tag' %}{% else %}{
    "id": {{ counter }},
    "url": "{{ site.url }}{{site.baseurl}}{{ page.url }}",
    "title": "{{ page.title | default: site.name | replace: '"', ' ' }}",
    "body": "{{ page.content | markdownify | replace: '.', '. ' | replace: '</h2>', ': ' | replace: '</h3>', ': ' | replace: '</h4>', ': ' | replace: '</p>', ' ' | strip_html | strip_newlines | replace: '  ', ' ' | replace: '"', ' ' }}"
    }{% assign counter = counter | plus: 1 %}{% unless forloop.last and site.without-plugin == empty and site.posts == empty %}, {% endunless %}{% endif %}{% endfor %}{% for page in site.without-plugin %}{
    "id": {{ counter }},
    "url": "{{ site.url }}{{site.baseurl}}{{ page.url }}",
    "title": "{{ page.title | default: site.name | replace: '"', ' ' }}",
    "body": "{{ page.content | markdownify | replace: '.', '. ' | replace: '</h2>', ': ' | replace: '</h3>', ': ' | replace: '</h4>', ': ' | replace: '</p>', ' ' | strip_html | strip_newlines | replace: '  ', ' ' | replace: '"', ' ' }}"
    }{% assign counter = counter | plus: 1 %}, {% endfor %}{% for page in site.posts %}{
    "id": {{ counter }},
    "url": "{{ site.url }}{{site.baseurl}}{{ page.url }}",
    "title": "{{ page.title | replace: '"', ' ' }}",
    "body": "{{ page.date | date: "%Y/%m/%d" }} - {{ page.content | markdownify | replace: '.', '. ' | replace: '</h2>', ': ' | replace: '</h3>', ': ' | replace: '</h4>', ': ' | replace: '</p>', ' ' | strip_html | strip_newlines | replace: '  ', ' ' | replace: '"', ' ' }}"
    }{% unless forloop.last %}, {% endunless %}{% endfor %}];

var idx = lunr(function () {
    this.ref("id");
    this.field("title", { boost: 12 });
    this.field("body");

    documents.forEach(function (doc) {
        this.add(doc);
    }, this);
});

var searchElements = {
    form: null,
    input: null,
    shell: null,
    backdrop: null,
    panel: null,
    title: null,
    count: null,
    list: null,
    empty: null
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function truncateText(text, length) {
    var normalized = String(text || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= length) {
        return normalized;
    }
    return normalized.slice(0, length).trim() + "...";
}

function buildQuery(term) {
    var cleaned = term.trim().toLowerCase();
    if (!cleaned) {
        return "";
    }

    var tokens = cleaned.split(/\s+/).filter(Boolean);
    return tokens.map(function (token) {
        return token + "* " + token + "~1";
    }).join(" ");
}

function renderResults(term, results) {
    searchElements.title.textContent = term ? 'Search results for "' + term + '"' : "Search the site";
    searchElements.count.textContent = results.length ? results.length + " result" + (results.length === 1 ? "" : "s") : "";
    searchElements.list.innerHTML = "";

    if (!term) {
        searchElements.empty.hidden = false;
        searchElements.empty.innerHTML = "<strong>Start typing to search Tech Treehouse.</strong><span>Find tutorials, tips, and older posts quickly.</span>";
        return;
    }

    if (!results.length) {
        searchElements.empty.hidden = false;
        searchElements.empty.innerHTML = "<strong>No results found.</strong><span>Try fewer words, different keywords, or a broader topic.</span>";
        return;
    }

    searchElements.empty.hidden = true;

    results.slice(0, 12).forEach(function (result) {
        var doc = documents[Number(result.ref)];
        var item = document.createElement("li");
        item.className = "lunrsearchresult";
        item.innerHTML =
            "<a href=\"" + escapeHtml(doc.url) + "\" class=\"search-result-link\">" +
                "<span class=\"title\">" + escapeHtml(doc.title || "Untitled") + "</span>" +
                "<span class=\"body\">" + escapeHtml(truncateText(doc.body, 180)) + "</span>" +
                "<span class=\"url\">" + escapeHtml(doc.url) + "</span>" +
            "</a>";
        searchElements.list.appendChild(item);
    });
}

function openSearchPanel() {
    searchElements.shell.hidden = false;
    document.body.classList.add("search-open");
}

function closeSearchPanel() {
    searchElements.shell.hidden = true;
    document.body.classList.remove("search-open");
}

function performSearch(term) {
    var cleaned = term.trim();
    var results = [];

    openSearchPanel();

    if (cleaned) {
        try {
            results = idx.search(buildQuery(cleaned));
        } catch (error) {
            results = idx.query(function (query) {
                cleaned.split(/\s+/).filter(Boolean).forEach(function (token) {
                    query.term(token.toLowerCase(), {
                        fields: ["title", "body"],
                        wildcard: lunr.Query.wildcard.TRAILING
                    });
                });
            });
        }
    }

    renderResults(cleaned, results);
    return false;
}

function initializeSearch() {
    searchElements.form = document.getElementById("lunrsearchform");
    searchElements.input = document.getElementById("lunrsearch");
    searchElements.shell = document.getElementById("lunrsearchresults");
    searchElements.backdrop = document.getElementById("lunrsearch-backdrop");
    searchElements.panel = document.getElementById("lunrsearch-panel");
    searchElements.title = document.getElementById("lunrsearch-title");
    searchElements.count = document.getElementById("lunrsearch-count");
    searchElements.list = document.getElementById("lunrsearch-list");
    searchElements.empty = document.getElementById("lunrsearch-empty");

    if (!searchElements.form || !searchElements.input || !searchElements.shell) {
        return;
    }

    searchElements.form.addEventListener("submit", function (event) {
        event.preventDefault();
        performSearch(searchElements.input.value);
    });

    searchElements.input.addEventListener("focus", function () {
        openSearchPanel();
        renderResults(searchElements.input.value.trim(), []);
    });

    searchElements.input.addEventListener("input", function () {
        performSearch(searchElements.input.value);
    });

    searchElements.backdrop.addEventListener("click", closeSearchPanel);
    document.getElementById("lunrsearch-close").addEventListener("click", closeSearchPanel);

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !searchElements.shell.hidden) {
            closeSearchPanel();
        }
    });
}

document.addEventListener("DOMContentLoaded", initializeSearch);
