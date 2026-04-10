# Changelog

## [1.5.0](https://github.com/sjovang/earnesty/compare/frontend-v1.4.0...frontend-v1.5.0) (2026-04-10)


### Features

* image thumbnail fixes, EXIF date sorting, and authenticated document fetching ([#98](https://github.com/sjovang/earnesty/issues/98)) ([edd68fa](https://github.com/sjovang/earnesty/commit/edd68faa389db7ca40478fa5a30a86b9f4e42fdd))
* improve publish button with flush mechanism, tooltip, and indicator dot ([#95](https://github.com/sjovang/earnesty/issues/95)) ([a73d2f5](https://github.com/sjovang/earnesty/commit/a73d2f5f3fb1e78bb3062a3c8ab5d2e10baed7b5))


### Bug Fixes

* convert markdown link syntax on paste to proper links ([#92](https://github.com/sjovang/earnesty/issues/92)) ([1cb7db4](https://github.com/sjovang/earnesty/commit/1cb7db41caf05178521b00842beabbafd7aa00ed))
* prevent image thumbnails from overlapping in library grid ([#93](https://github.com/sjovang/earnesty/issues/93)) ([9e39903](https://github.com/sjovang/earnesty/commit/9e399032850c783c4c110f7f2e85ac0988c7c4f2))
* prevent text bouncing and layout shift when typing in Chromium browsers ([#100](https://github.com/sjovang/earnesty/issues/100)) ([9075842](https://github.com/sjovang/earnesty/commit/9075842498c4295e3311bb15a2eb4399238e1233))
* scroll caret above virtual keyboard on mobile ([#104](https://github.com/sjovang/earnesty/issues/104)) ([7afa900](https://github.com/sjovang/earnesty/commit/7afa900c2290b97d3ae3eeb816f991f51e0080f8))

## [1.4.0](https://github.com/sjovang/earnesty/compare/frontend-v1.3.0...frontend-v1.4.0) (2026-04-09)


### Features

* add Application Insights for distributed tracing ([#79](https://github.com/sjovang/earnesty/issues/79)) ([bd2e8b3](https://github.com/sjovang/earnesty/commit/bd2e8b3f47b5542f68dbdaee2cae0b4ebd194c4f))
* auto-create draft document on first autosave ([#81](https://github.com/sjovang/earnesty/issues/81)) ([db1fd35](https://github.com/sjovang/earnesty/commit/db1fd35dbf4ad9ae88969b0d72f65f8a3f3cda27))
* display document title as schema-enforced editor headline ([#64](https://github.com/sjovang/earnesty/issues/64)) ([8d925ad](https://github.com/sjovang/earnesty/commit/8d925ad24e36bc2d8c18337fc86352e86fad191c))
* image upload and block settings ([#78](https://github.com/sjovang/earnesty/issues/78)) ([f335520](https://github.com/sjovang/earnesty/commit/f3355202a739bd82bc9ca381e39b513844442045))
* improve menubar button icons and helper tooltips ([#60](https://github.com/sjovang/earnesty/issues/60)) ([12f7098](https://github.com/sjovang/earnesty/commit/12f70989ed35c83da205b2ade4dd45adf1c4ddcc))
* publish metadata modal with required/optional tabs ([#82](https://github.com/sjovang/earnesty/issues/82)) ([f0b0a15](https://github.com/sjovang/earnesty/commit/f0b0a15d8651fa1403ad0d70fca7e5980abfeca0))
* settings menu with theme, font, size, and width controls ([#62](https://github.com/sjovang/earnesty/issues/62)) ([3bb3748](https://github.com/sjovang/earnesty/commit/3bb3748cee313c40bf54aebee20b06e87a0d4958))
* settings menu with whimsical color palettes ([#66](https://github.com/sjovang/earnesty/issues/66)) ([a6a6d6d](https://github.com/sjovang/earnesty/commit/a6a6d6d9599d84c593621ffa887c86f08ea8db7d))


### Bug Fixes

* autosave title persistence, implement document publishing, and fix API function discovery ([#70](https://github.com/sjovang/earnesty/issues/70)) ([a009fa5](https://github.com/sjovang/earnesty/commit/a009fa587a6d5f409885d89ef85ed7d3661c38ce))
* break infinite Entra ID login loop ([#57](https://github.com/sjovang/earnesty/issues/57)) ([8364853](https://github.com/sjovang/earnesty/commit/836485341dcf37447bf9721050a0073c3622e297))
* guard sanityClient against missing VITE_SANITY_PROJECT_ID at import time ([#84](https://github.com/sjovang/earnesty/issues/84)) ([1b787dd](https://github.com/sjovang/earnesty/commit/1b787dda8895ecd1348f452da2a6733d9b8b6d0f))
* lazy Sanity client init, bypass CDN, and guard publish flow ([#75](https://github.com/sjovang/earnesty/issues/75)) ([6dc8500](https://github.com/sjovang/earnesty/commit/6dc8500db8da5897fe727e9287d747e11a8e9bc4))
* move @azure/functions to dependencies and add publish feedback ([#80](https://github.com/sjovang/earnesty/issues/80)) ([31301c7](https://github.com/sjovang/earnesty/commit/31301c72b7b92d49a24670dfcf73239ae0dad407))
* redirect 401 to app instead of showing raw error page ([#63](https://github.com/sjovang/earnesty/issues/63)) ([c0fba78](https://github.com/sjovang/earnesty/commit/c0fba7873df3c5e7564923a56a40eac53e83350a))
* resolve transitive dependency vulnerabilities in devDependencies ([#74](https://github.com/sjovang/earnesty/issues/74)) ([36ca3b7](https://github.com/sjovang/earnesty/commit/36ca3b7b6672000875fb0f221ee320b4de747a15))

## [1.3.0](https://github.com/sjovang/earnesty/compare/frontend-v1.2.1...frontend-v1.3.0) (2026-04-03)


### Features

* add Entra ID authentication via SWA built-in auth ([#37](https://github.com/sjovang/earnesty/issues/37)) ([ebb9472](https://github.com/sjovang/earnesty/commit/ebb9472ebaeaa59d93a843698697676e667808ee))
* add favicon, apple touch icon, and Open Graph image ([#45](https://github.com/sjovang/earnesty/issues/45)) ([fde6916](https://github.com/sjovang/earnesty/commit/fde69169b0062af56e8a5564b82fcdd379e05a20))
* anchor empty/short documents near viewport bottom ([#53](https://github.com/sjovang/earnesty/issues/53)) ([537eab0](https://github.com/sjovang/earnesty/commit/537eab0b97157b4d3147a473f6964e9cb54aa424))
* full-width three-column menubar on large viewports ([#32](https://github.com/sjovang/earnesty/issues/32)) ([68b1791](https://github.com/sjovang/earnesty/commit/68b17918df740333e365cd499694b40c54e58f75))
* open user profile modal on avatar click ([#54](https://github.com/sjovang/earnesty/issues/54)) ([9bb1c50](https://github.com/sjovang/earnesty/commit/9bb1c5071acdb84c8d24479b83c30fc9ed4e696e))


### Bug Fixes

* auth state not updated after OAuth callback ([#33](https://github.com/sjovang/earnesty/issues/33)) ([c3b3759](https://github.com/sjovang/earnesty/commit/c3b37592266644ee6932933d8429026ad89e7b07))
* correct newest/oldest sort order in open document modal ([#40](https://github.com/sjovang/earnesty/issues/40)) ([de4e1e9](https://github.com/sjovang/earnesty/commit/de4e1e9c1c32e1c2965560fc899ae654384c1aa0))
* hardcode tenant ID in SWA auth issuer URL ([#52](https://github.com/sjovang/earnesty/issues/52)) ([c4034cb](https://github.com/sjovang/earnesty/commit/c4034cbd0f28415374e9e76669538eaafd274a39))
* prevent theme FOUC and add post_login_redirect_uri for auth ([#49](https://github.com/sjovang/earnesty/issues/49)) ([ce4d19d](https://github.com/sjovang/earnesty/commit/ce4d19d49ca6fd92478e9d1b2b312093bce24b49))
* remove large top margin when document is loaded ([#31](https://github.com/sjovang/earnesty/issues/31)) ([e825c40](https://github.com/sjovang/earnesty/commit/e825c40591bb1b013d428b20ef0314804ad9ed83))

## [1.2.1](https://github.com/sjovang/earnesty/compare/frontend-v1.2.0...frontend-v1.2.1) (2026-04-03)


### Bug Fixes

* prevent theme FOUC and add post_login_redirect_uri for auth ([#49](https://github.com/sjovang/earnesty/issues/49)) ([ce4d19d](https://github.com/sjovang/earnesty/commit/ce4d19d49ca6fd92478e9d1b2b312093bce24b49))

## [1.2.0](https://github.com/sjovang/earnesty/compare/frontend-v1.1.1...frontend-v1.2.0) (2026-04-03)


### Features

* add favicon, apple touch icon, and Open Graph image ([#45](https://github.com/sjovang/earnesty/issues/45)) ([fde6916](https://github.com/sjovang/earnesty/commit/fde69169b0062af56e8a5564b82fcdd379e05a20))

## [1.1.1](https://github.com/sjovang/earnesty/compare/frontend-v1.1.0...frontend-v1.1.1) (2026-04-03)


### Bug Fixes

* correct newest/oldest sort order in open document modal ([#40](https://github.com/sjovang/earnesty/issues/40)) ([de4e1e9](https://github.com/sjovang/earnesty/commit/de4e1e9c1c32e1c2965560fc899ae654384c1aa0))

## [1.1.0](https://github.com/sjovang/earnesty/compare/frontend-v1.0.0...frontend-v1.1.0) (2026-04-03)


### Features

* add Entra ID authentication via SWA built-in auth ([#37](https://github.com/sjovang/earnesty/issues/37)) ([ebb9472](https://github.com/sjovang/earnesty/commit/ebb9472ebaeaa59d93a843698697676e667808ee))
* full-width three-column menubar on large viewports ([#32](https://github.com/sjovang/earnesty/issues/32)) ([68b1791](https://github.com/sjovang/earnesty/commit/68b17918df740333e365cd499694b40c54e58f75))


### Bug Fixes

* auth state not updated after OAuth callback ([#33](https://github.com/sjovang/earnesty/issues/33)) ([c3b3759](https://github.com/sjovang/earnesty/commit/c3b37592266644ee6932933d8429026ad89e7b07))
* remove large top margin when document is loaded ([#31](https://github.com/sjovang/earnesty/issues/31)) ([e825c40](https://github.com/sjovang/earnesty/commit/e825c40591bb1b013d428b20ef0314804ad9ed83))

## 1.0.0 (2026-03-29)


### Features

* Earnesty writing UI — scaffold, editor, Markdown, branding ([#1](https://github.com/sjovang/earnesty/issues/1)) ([222c9b6](https://github.com/sjovang/earnesty/commit/222c9b6de91fa41f9f33ed01bfcab9bfaa75d288))
* fluid type/space (Utopia), 60ch editor width, mobile hamburger ([#21](https://github.com/sjovang/earnesty/issues/21)) ([c2e8a89](https://github.com/sjovang/earnesty/commit/c2e8a89dc52e5a9b838c50b234cd97ed06a5a255))
* Sanity integration, editor features, and UX polish ([#2](https://github.com/sjovang/earnesty/issues/2)) ([12b1736](https://github.com/sjovang/earnesty/commit/12b173651225266437dbea7b4438391c7312dd2b))


### Bug Fixes

* add auth error handling and dev logging ([#8](https://github.com/sjovang/earnesty/issues/8)) ([d1d532d](https://github.com/sjovang/earnesty/commit/d1d532d90be5bae40fce73e1e91877404b84ef44))
* check hash fragment for token in callback ([#18](https://github.com/sjovang/earnesty/issues/18)) ([d2bb412](https://github.com/sjovang/earnesty/commit/d2bb41251b47e4973e0bb889b55ca14ba837d645))
* correct Sanity OAuth token handling after redirect ([#6](https://github.com/sjovang/earnesty/issues/6)) ([c251fd5](https://github.com/sjovang/earnesty/commit/c251fd5973da6255a982c465a343564e7fd7a2a3))
* improve OAuth redirect handling and surface origin mismatch ([#9](https://github.com/sjovang/earnesty/issues/9)) ([3eef89d](https://github.com/sjovang/earnesty/commit/3eef89da6e0291c4d7f01d6f04d97258826de34e))
* replace popup auth with clean full-page redirect ([#17](https://github.com/sjovang/earnesty/issues/17)) ([dd9fce9](https://github.com/sjovang/earnesty/commit/dd9fce987f15fd19831d00c9ba209fb91b358166))
* restore missing .signin__loading selector in SignInModal ([#16](https://github.com/sjovang/earnesty/issues/16)) ([0535f6e](https://github.com/sjovang/earnesty/commit/0535f6e7af256a7099a75d8a858931354c276b2a))
* rework OAuth flow using /callback route and BroadcastChannel ([#15](https://github.com/sjovang/earnesty/issues/15)) ([bf0c4a8](https://github.com/sjovang/earnesty/commit/bf0c4a8f772d35c732da0b04aae0c4dd617ed7ea))
* use popup window for Sanity OAuth ([#11](https://github.com/sjovang/earnesty/issues/11)) ([312eb11](https://github.com/sjovang/earnesty/commit/312eb11f222be5be0aac163a9e3cdfd8098b6c1a))
