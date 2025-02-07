import { type IAgentRuntime } from "@elizaos/core";
import { createClient } from "@supabase/supabase-js";

let runtime: IAgentRuntime;






export function generateUniqueCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        code += characters[randomIndex];
    }

    return code;
}