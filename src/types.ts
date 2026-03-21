import type { WSA_LANGUAGES, WORKING_WSA_LANGUAGES } from "./constants"

export enum DiffEnum {
    NoChange = "NO_CHANGE",
    ChangeRes = "CHANGE_RES",
    ChangeResAndClear = "CHANGE_RES_AND_CLEAR",
}

export type Urgency = "low" | "normal" | "critical"

export type WSALanguage = (typeof WSA_LANGUAGES)[keyof typeof WSA_LANGUAGES]
export type WorkingWSALanguage = (typeof WORKING_WSA_LANGUAGES)[keyof typeof WORKING_WSA_LANGUAGES]

export interface CliFlags {
    lang: WorkingWSALanguage
    textNotifs: boolean
    soundNotifs: boolean
    detached: boolean
    help: boolean
}
