// ==UserScript==
// @name         起点小说解锁X
// @version      1.0
// @description  可解锁起点小说VIP付费章节，可点击下一页实现不翻页加载
// @author       落雪霜林
// @match        https://m.qidian.com/book/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @namespace    https://github.com/onlytheworld/qdreader/
// ==/UserScript==

(function () {
    "use strict";
    var { maintail, Aliaslist, nextpage } = init();
    var clist;
    mainFunction();

    function init() {
        // 对修改书名的情况，构建现书名至原书名的映射表
        let Aliaslist = {
            "你有科学，我有神功": "我弟子明明超强却以德服人",
        };
        let maintail;
        if (!QDisVIP()) {
            maintail = document.querySelector("#chapterContent a");
        } else {
            maintail = document.querySelector("#chapterContent a");
        }
        if (maintail == null) {
            alert("初始化失败");
            throw new Error("Stop script");
        }
        let nextpage = {
            idx: 0,
            qdurl: "",
        };
        return { maintail, Aliaslist, nextpage };
    }

    //获取书本名
    function QDgetBookName() {
        // @ts-ignore
        return g_data.book.bookName;
    }

    //本章是否是VIP
    function QDisVIP() {
        // @ts-ignore
        return g_data.chapter.vipStatus;
    }

    //本章是否已被购买
    function QDisbuy() {
        // @ts-ignore
        return g_data.chapter.isbuy;
    }

    //获取作者
    function QDgetAuthorName() {
        // @ts-ignore
        return g_data.book.authorName;
    }

    //获取书本原名
    function QDgetAliasBookName() {
        return Aliaslist[QDgetBookName()];
    }

    /**
     * @param {HTMLHtmlElement | Document} doc
     */
    function QDgetBookChapter(doc) {
        let head = doc.querySelector("#chapterTitle");
        if (head) {
            let res = "" + head.innerHTML;
            let re = res.replace(/ /g, "");
            return re;
        }
        alert("抓取章节名失败失败");
        return "";
    }

    /**
     * @param {string} content
     */
    function QDsetContent(content) {
        let con = document.createElement("div");
        con.innerHTML = content;
        con.setAttribute("class", "read-content");
        maintail.insertAdjacentHTML("beforebegin", con.outerHTML);
    }

    function request(method, url, resolve) {
        // @ts-ignore
        GM_xmlhttpRequest({
            method,
            url,
            timeout: 10000,
            onload: (res) => {
                let htmldoc = document.createElement("html");
                htmldoc.innerHTML = res.responseText;
                resolve(htmldoc);
            },
            onerror: () => {
                alert("加载 " + url + " 失败");
            },
        });
    }

    /**
     * @param {HTMLHtmlElement} responce
     */
    function searchBook(responce) {
        let resList = [];
        let res = responce.querySelector("body > div.result-list");
        if (res) {
            let bookList = res.querySelectorAll(
                "div > div.result-game-item-detail > h3 > a"
            );
            let authorList = res.querySelectorAll(
                "div > div.result-game-item-detail > div > p:nth-child(1) > span:nth-child(2)"
            );
            for (let i = 0; i < bookList.length; i++) {
                resList.push({
                    bookName: bookList[i].getAttribute("title"),
                    author: authorList[i].innerHTML,
                    url: "http://www.wbxsw.com" + bookList[i].getAttribute("href"),
                });
            }
        }
        return resList;
    }

    /**
     * @param {HTMLHtmlElement} response
     */
    function getChapterList(response) {
        let resList = [];
        let cateList = response.querySelectorAll("#list > dl > dd > a");
        for (let ele of cateList) {
            let url = "http://www.wbxsw.com" + ele.getAttribute("href");
            resList.push({ title: ele.innerHTML.replace(/ /g, ""), url: url });
        }
        return resList;
    }

    /**
     * @param {HTMLHtmlElement} response
     */
    function getContent(response) {
        let con = response.querySelector("#content");
        if (con) {
            return con.innerHTML;
        }
        return "";
    }

    /**
     * @param {HTMLHtmlElement} response
     */
    function getQDTitleContent(response) {
        let cont = response.querySelector("div > div.text-head");
        if (cont) {
            return cont.outerHTML;
        }
        return "";
    }

    /**
     * @param {HTMLHtmlElement} response
     */
    function getQDContent(response) {
        let cont = response.querySelector("div > div.read-content");
        if (cont) {
            return cont.outerHTML;
        }
        return "";
    }

    //解析页面函数
    function prelaunch() {
        if (QDgetAliasBookName() == undefined) {
            request(
                "GET",
                "http://www.wbxsw.com/search.php?q=" + QDgetBookName(),
                firstsearch
            );
        } else {
            request(
                "GET",
                "http://www.wbxsw.com/search.php?q=" + QDgetAliasBookName(),
                firstsearch
            );
        }
    }

    /**
     * @param {HTMLHtmlElement} responce
     */
    function firstsearch(responce) {
        let r = searchBook(responce);
        let idx = "";
        //优先匹配名字相同的
        for (let i in r) {
            if (
                r[i].bookName == QDgetBookName() ||
                r[i].bookName == QDgetAliasBookName()
            ) {
                idx = i;
                if (r[i].author == QDgetAuthorName()) {
                    break;
                }
            }
        }
        //获取第一项结果章节目录
        if (r[idx] == undefined) {
            alert("该小说暂无资源");
            return;
        }
        request("GET", r[idx].url, firstchapter);
    }

    /**
     * @param {HTMLHtmlElement} responce
     */
    function firstchapter(responce) {
        clist = getChapterList(responce);
        let Chaptertitle = QDgetBookChapter(document);
        //获取章节名
        for (let i in clist) {
            if (clist[i].title == Chaptertitle) {
                if (QDisVIP() && !QDisbuy()) {
                    request("GET", clist[i].url, firstcontent);
                }
                nextpage.idx = Number(i) + 1;
                break;
            }
        }
    }

    /**
     * @param {HTMLHtmlElement} response
     */
    function firstcontent(response) {
        let content = getContent(response);
        let mainspace = document.querySelector("#chapterContent .read-section");
        if (mainspace) {
            let read_content = mainspace.querySelector("div");
            if (read_content) {
                mainspace.removeChild(read_content);
            }
            let read_author = mainspace.querySelector("div.read-author-say");
            if (read_author) {
                mainspace.removeChild(read_author);
            }
            let readLoadNext = document.querySelector("#readLoadNext");
            if (readLoadNext) {
                let a = readLoadNext.querySelector("#aGotoBookEnd");
                if (a) readLoadNext.removeChild(a);

            }
        }
        QDsetContent(content);
        console.log("写入成功");
    }

    //点击下一页、实现不翻页加载下一章
    // @ts-ignore
    unsafeWindow.next = function () {
        request(
            "GET",
            nextpage.qdurl,
            function (/** @type {HTMLHtmlElement} */ response) {
                let s = response.querySelector("body > script");
                if (s) {
                    eval(s.innerHTML.replace("var", ""));
                }
                let titlecont = getQDTitleContent(response);
                if (QDisVIP() && !QDisbuy()) {
                    let nexttitle = QDgetBookChapter(response);
                    if (clist[nextpage.idx].title != nexttitle) {
                        alert("章节名不对应");
                        throw new Error("Stop script");
                    }
                    request(
                        "GET",
                        clist[nextpage.idx].url,
                        function (/** @type {HTMLHtmlElement} */ res) {
                            let content = getContent(res);
                            maintail.insertAdjacentHTML("beforebegin", titlecont);
                            QDsetContent(content);
                        }
                    );
                } else {
                    let content = getQDContent(response);
                    maintail.insertAdjacentHTML("beforebegin", titlecont);
                    maintail.insertAdjacentHTML("beforebegin", content);
                }
                let nexttitle = response.querySelector("head > title");
                if (nexttitle) {
                    history.pushState(
                        `{title: ${document.title}, url: ${location.href}}`,
                        nexttitle.innerHTML,
                        nextpage.qdurl
                    );
                }
                nextpage.idx += 1;
                let nexturl = response.querySelector(
                    ".chapter-control.dib-wrap > a:nth-child(5)"
                );
                if (nexturl) {
                    let href = nexturl.getAttribute("href");
                    if (href) {
                        nextpage.qdurl = href;
                    }
                }
            }
        );
    };

    function mainFunction() {
        let chapterNext = document.querySelector("#readLoadNext a");
        if (chapterNext) {
            // @ts-ignore
            let href = g_data.endUrl.replace('end', g_data.chapter.next);
            if (href) {
                nextpage.qdurl = 'https:' + href;
            }
            chapterNext.setAttribute("onclick", "window.next()");
        }
        prelaunch();
    }
})();
