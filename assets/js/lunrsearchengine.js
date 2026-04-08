---
layout: null
sitemap: false
---

var documents = [
{% for page in site.posts %}
  {
    "id": {{ forloop.index0 | jsonify }},
    "url": {{ page.url | absolute_url | jsonify }},
    "title": {{ page.title | strip_html | normalize_whitespace | jsonify }},
    "date": {{ page.date | date: "%Y-%m-%d" | jsonify }},
    "body": {{ page.content | markdownify | strip_html | normalize_whitespace | jsonify }}
  }{% unless forloop.last %},{% endunless %}
{% endfor %}
];

var searchElements = {
    trigger: null,
    input: null,
    shell: null,
    backdrop: null,
    panel: null,
    list: null
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

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenize(term) {
    return normalizeText(term).split(" ").filter(Boolean);
}

function highlightText(text, tokens) {
    var highlighted = escapeHtml(text);

    tokens
        .slice()
        .sort(function (a, b) { return b.length - a.length; })
        .forEach(function (token) {
            if (!token) {
                return;
            }

            var pattern = new RegExp("(" + escapeRegExp(token) + ")", "gi");
            highlighted = highlighted.replace(pattern, "<strong>$1</strong>");
        });

    return highlighted;
}

function scoreDocument(doc, tokens) {
    var title = normalizeText(doc.title);
    var body = normalizeText(doc.body);
    var slug = normalizeText(doc.url.split("/").filter(Boolean).pop() || "");
    var phrase = tokens.join(" ");
    var score = 0;

    if (phrase && title === phrase) {
        score += 1000;
    }

    if (phrase && title.indexOf(phrase) === 0) {
        score += 500;
    }

    if (phrase && title.indexOf(phrase) !== -1) {
        score += 300;
    }

    if (phrase && slug.indexOf(phrase) !== -1) {
        score += 220;
    }

    tokens.forEach(function (token) {
        if (title === token || slug === token) {
            score += 220;
        }
        if (title.indexOf(token) === 0) {
            score += 120;
        }
        if (title.indexOf(token) !== -1) {
            score += 80;
        }
        if (slug.indexOf(token) !== -1) {
            score += 60;
        }
        if (body.indexOf(token) !== -1) {
            score += 15;
        }
    }); 

    return score;
}

function runSearch(term) {
    var tokens = tokenize(term);

    if (!tokens.length) {
        return [];
    }

    return documents
        .map(function (doc) {
            return {
                ref: String(doc.id),
                score: scoreDocument(doc, tokens),
                date: doc.date || ""
            };
        })
        .filter(function (result) {
            return result.score > 0;
        })
        .sort(function (a, b) {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return String(b.date).localeCompare(String(a.date));
        });
}

function renderResults(term, results) {
    searchElements.list.innerHTML = "";

    if (!term) {
        return;
    }

    if (!results.length) {
        searchElements.list.innerHTML = "<li class=\"lunrsearchresult lunrsearchresult-empty\"><div class=\"search-result-link\"><span class=\"title\">No results found</span><span class=\"body\">Try fewer words or a different keyword.</span></div></li>";
        return;
    }

    results.slice(0, 12).forEach(function (result) {
        var doc = documents[Number(result.ref)];
        var item = document.createElement("li");
        item.className = "lunrsearchresult";
        var snippet = truncateText(doc.body, 180);
        var tokens = tokenize(term);
        item.innerHTML =
            "<a href=\"" + escapeHtml(doc.url) + "\" class=\"search-result-link\">" +
                "<span class=\"title\">" + highlightText(doc.title || "Untitled", tokens) + "</span>" +
                "<span class=\"body\">" + highlightText(snippet, tokens) + "</span>" +
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
    searchElements.list = document.getElementById("lunrsearch-list");

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
