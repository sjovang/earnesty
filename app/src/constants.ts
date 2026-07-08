import { runtimeConfig } from './config/runtime'

/** Default placeholder content shown in a fresh, unsaved editor. */
export const INTRO_HTML = `<h1 data-type="title">${runtimeConfig.app.introTitle}</h1>
<p>${runtimeConfig.app.introLead}</p>
<p>${runtimeConfig.app.introHint}</p>`
