# Changelog

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
