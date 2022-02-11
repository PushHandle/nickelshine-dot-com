# nickelshine.com

This uses Github Pages to quickly deploy an index.html to the domain (on name.com)

Helpful article: https://www.name.com/blog/using-custom-domain-github-project-pages

Its intended to be a single static html page to verify LLC information during application reviews.

Here are a few things to know:

0. Keep CNAME file in repo. Github pages injects it when initiating the custom domain.
1. CNAME record for Domain on Name.com will not work with MX records
2. Name.com provides apps for both Titan Email and Github
3. Those apps inject the DNS records and work well together 
4. Titan Email is provided at annual fee by Name.com
5. Email can be logged into at https://app.titan.email/ or their mobile app
6. The content for this page was borrowed from a few other registration verification sites
7. Github Pages will deploy on its own and you can track history in "Environments"
