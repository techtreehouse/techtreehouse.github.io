---
layout: null
sitemap: false
---

{% assign counter = 0 %}
var documents = [{% for page in site.posts %}{
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
    trigger: null,
    input: null,
    shell: null,
    backdrop: null,
    panel: null,
    title: null,
    count: null,
    list: null,
    empty: null
};
var searchPanelOpen = false;

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

function tokenize(term) {
    return term.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function buildQuery(tokens) {
    return tokens.map(function (token) {
        return token + "*";
    }).join(" ");
}

function scoreDocument(doc, tokens) {
    var title = String(doc.title || "").toLowerCase();
    var body = String(doc.body || "").toLowerCase();
    var score = 0;

    tokens.forEach(function (token) {
        if (title === token) {
            score += 120;
        }
        if (title.indexOf(token) !== -1) {
            score += 40;
        }
        if (body.indexOf(token) !== -1) {
            score += 8;
        }
    });

    if (tokens.length && title.indexOf(tokens.join(" ")) !== -1) {
        score += 80;
    }

    return score;
}

function runSearch(term) {
    var tokens = tokenize(term);
    var lunrMatches = [];
    var combined = {};

    if (!tokens.length) {
        return [];
    }

    try {
        lunrMatches = idx.search(buildQuery(tokens));
    } catch (error) {
        lunrMatches = [];
    }

    lunrMatches.forEach(function (match) {
        var ref = String(match.ref);
        combined[ref] = {
            ref: ref,
            score: match.score * 100
        };
    });

    documents.forEach(function (doc) {
        var manualScore = scoreDocument(doc, tokens);
        if (!manualScore) {
            return;
        }

        var ref = String(doc.id);
        if (combined[ref]) {
            combined[ref].score += manualScore;
        } else {
            combined[ref] = {
                ref: ref,
                score: manualScore
            };
        }
    });

    return Object.keys(combined)
        .map(function (key) { return combined[key]; })
        .sort(function (a, b) { return b.score - a.score; });
}

function renderResults(term, results) {
    searchElements.title.textContent = term ? 'Post results for "' + term + '"' : "Search Tech Treehouse posts";
    searchElements.count.textContent = results.length ? results.length + " result" + (results.length === 1 ? "" : "s") : "";
    searchElements.list.innerHTML = "";

    if (!term) {
        searchElements.empty.hidden = false;
        searchElements.empty.innerHTML = "<strong>Start typing to search Tech Treehouse posts.</strong><span>Results will only show blog posts and tutorials.</span>";
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
    if (searchPanelOpen) {
        return;
    }

    searchPanelOpen = true;
    searchElements.shell.hidden = false;
    document.body.classList.add("search-open");
    window.setTimeout(function () {
        searchElements.input.focus();
    }, 20);
}

function closeSearchPanel() {
    searchPanelOpen = false;
    searchElements.shell.hidden = true;
    document.body.classList.remove("search-open");
}

function performSearch(term) {
    var cleaned = term.trim();
    var results = [];

    if (cleaned) {
        results = runSearch(cleaned);
    }

    renderResults(cleaned, results);
    return false;
}

function initializeSearch() {
    searchElements.trigger = document.getElementById("lunrsearch-trigger");
    searchElements.input = document.getElementById("lunrsearch");
    searchElements.shell = document.getElementById("lunrsearchresults");
    searchElements.backdrop = document.getElementById("lunrsearch-backdrop");
    searchElements.panel = document.getElementById("lunrsearch-panel");
    searchElements.title = document.getElementById("lunrsearch-title");
    searchElements.count = document.getElementById("lunrsearch-count");
    searchElements.list = document.getElementById("lunrsearch-list");
    searchElements.empty = document.getElementById("lunrsearch-empty");

    if (!searchElements.trigger || !searchElements.input || !searchElements.shell) {
        return;
    }

    searchElements.trigger.addEventListener("click", function () {
        openSearchPanel();
        renderResults(searchElements.input.value.trim(), []);
    });

    searchElements.input.addEventListener("input", function () {
        performSearch(searchElements.input.value);
    });

    searchElements.backdrop.addEventListener("click", closeSearchPanel);
    document.getElementById("lunrsearch-close").addEventListener("click", closeSearchPanel);

    document.addEventListener("keydown", function (event) {
        var isTypingField = /input|textarea|select/i.test(document.activeElement && document.activeElement.tagName);

        if ((event.key === "/" || (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) && !isTypingField) {
            event.preventDefault();
            openSearchPanel();
            renderResults(searchElements.input.value.trim(), []);
            return;
        }

        if (event.key === "Escape" && !searchElements.shell.hidden) {
            closeSearchPanel();
        }
    });
}

document.addEventListener("DOMContentLoaded", initializeSearch);
