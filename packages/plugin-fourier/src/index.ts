import type { Plugin } from "@elizaos/core";
import { generateAction } from "./action/generateLink";


export const fourierPlugin: Plugin = {
    name: "fourier",
    description: "Fourier is a payment platform that helps in managing and accepting payment with Links and QR codes",
    actions: [generateAction],
    evaluators: [],
    providers: [],
}

export default fourierPlugin;