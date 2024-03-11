import dayjs from "dayjs";
import fs from "fs";
import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import axios from "axios";
import timeago from "timeago.js";
import { JSDOM } from "jsdom";

const octokit = new Octokit({
  auth: process.env.PAT,
});

run(new Date()).catch((err) => {
  throw err;
});

async function run(date) {
  const contents = await getHeadlines();
  console.log(contents);
  const res = await openIssue({
    owner: "OliverOffing",
    repo: "stackernews-weekly",
    title: `Stacker News Weekly Top 10 @${new Date(date)
      .toISOString()
      .slice(0, 10)}`,
    body: contents,
  });
  const issueNumber = res.data.number;
  await lockIssue({
    owner: "OliverOffing",
    repo: "stackernews-weekly",
    issueNumber,
  });
}

async function getHeadlines() {
  console.log("start fetching headlines");
  try {
    const res = await axios.get(`https://stacker.news/top/posts/week`);
    const dom = new JSDOM(res.data);
    const links = Array.from(
      new Map(
        Array.from(dom.window.document.querySelectorAll('a[href^="/items/"]'))
          .filter((link) =>
            Array.from(link.classList).some((className) =>
              className.startsWith("item_title_"),
            ),
          )
          .map((link) => [
            link.getAttribute("href"),
            { title: link.textContent, link: link.getAttribute("href") },
          ]),
      ).values(),
    ).slice(0, 10);

    const contents = links
      .map(({ title, link }, i) => {
        const url = `https://stacker.news${link}`;
        return `${i + 1}. **[${title}](${url})**

`;
      })
      .join("");

    return `${contents}
<p  align="right"><a href="https://stacker.news/o"> <i>❤️ Sponsor the author</i></a> </p>
`;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function openIssue({ owner, repo, title, body }) {
  try {
    console.log("opening issue");
    const res = await octokit.request("POST /repos/{owner}/{repo}/issues", {
      owner,
      repo,
      title,
      body,
    });
    console.log("opened");
    return res;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

async function lockIssue({ owner, repo, issueNumber }) {
  console.log("locking issue");
  await octokit.request(
    "PUT /repos/{owner}/{repo}/issues/{issue_number}/lock",
    {
      owner: owner,
      repo: repo,
      issue_number: issueNumber,
      lock_reason: "resolved",
    },
  );
  console.log("locked");
}
