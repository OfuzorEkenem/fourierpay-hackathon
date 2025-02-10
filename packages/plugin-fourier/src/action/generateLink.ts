import { elizaLogger, composeContext, generateObjectDeprecated } from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
} from "@elizaos/core";
import { createClient } from '@supabase/supabase-js';
import { generateUniqueCode } from "../utils";

let runtime: IAgentRuntime

interface GenerateLink extends Content {
    title: string;
    description: string;
    amount: string | number;
    address: string;
    details: object;
}

interface PaymentData {
    title: string;
    code: string;
    payment_description?: string;
    amount: number;
    address: string;
    details: Record<string, any>;
    agent_id: string;
    user_id: string;
    token_types: string[];
    chains: string[];
}

// Constants
const SUPABASE_URL = 'https://gowfvrwxcjffdazpttem.supabase.co';
const DEFAULT_TOKEN_TYPES = ['USDC'];
const DEFAULT_CHAINS = ['sui'];
const PAYMENT_URL_BASE = 'https://fourier-sui.vercel.app/payment';

function isGenerateLink(
    content: GenerateLink
): content is GenerateLink {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.title === "string" &&
        typeof content.description === "string" &&
        typeof content.address === "string" &&
        typeof content.details == "object" &&
        (typeof content.amount === "string" || typeof content.amount === "number" &&
            typeof content.amount === "number")
    )
}



const generatelinkTemplate = `Respond with a JSON markdown block containing only the extracted values. make sure you get the title of the payment and address of the user. Title of payment , amount and address for the user to send tokens is compulsory

{{recentMessages}}

Given the recent messages , extract the following information about the requested generation Link:
-Title of the Payment
-Description of the Payment , let this be the summary of the payment
-Amount of the payment , let the amount be a number e.g 10USDC -> 10 , 20USDC -> 20
-address of the user to accept payment
-other details the user wants to collect from the payer.(like name , age , job description etc)...

Respond with a JSON markdown block containing only the extracted values.

\`\`\`json
{
   "title":"Contribution for Davids Graduation Ceremony",
   "description":"This contribution is for Davids Graduation Ceremony",
   "amount":1000,
   "address":"0xhjhhi1uiuio"
   "details":{}
}
\`\`\`
`;

// Database operations
async function getOrCreateUser(supabase: any, agentId: string) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq('agent_id', agentId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    if (!data) {
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                agent_id: agentId,
                payment_links_count: 0,
                total_amount: 0
            }])
            .select()
            .single();

        if (createError) throw createError;
        return newUser;
    }

    return data;
}

export const generateAction: Action = {
    name: "generateLink",
    similes: ["CREATE_LINK", "GENERATE LINK", "CREATE_PAYMENT"],
    description: "Generate Link for the user",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Create a payment Links for this user...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state)
        };

        const getContent = composeContext({
            state,
            template: generatelinkTemplate
        })
        const content = await generateObjectDeprecated({
            runtime,
            context: getContent,
            modelClass: ModelClass.SMALL
        });
        console.log(content);
        const transferContent = content as GenerateLink;
        const supabaseUrl = 'https://gowfvrwxcjffdazpttem.supabase.co';
        const SUPABASE_KEY = runtime.getSetting("SUPABASE_KEY");
        const supabase = createClient(supabaseUrl, SUPABASE_KEY);

        if (!isGenerateLink(transferContent)) {
            console.error("Invalid content for TRANSFER TOKEN");
            callback({
                text: "Unable to process transfer request. Invalid content provided.",
                content: { error: "Invalid transfer content" }
            })
            return false
        }
        try {
            const { data, error } = await supabase.from("users").select("*").eq('agent_id', state.agentId);
            if (data.length === 0) {
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .insert([{
                        agent_id: state.agentId,
                        payment_links_count: 0,
                        total_amount: 0
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                console.log("New User",)
                const code = generateUniqueCode();
                const { data, error } = await supabase.from("payments").insert([{
                    title: content.title,
                    code: code,
                    payment_description: content?.description,
                    amount: Number(content.amount),
                    address: content.address,
                    details: content.details,
                    agent_id: state.agentId,
                    user_id: newUser?.id,
                    token_types: ['USDC'],
                    chains: ['sui'],
                }]).select();
                callback({
                    text: "Successfully created your payment link is",
                    content: { text: `Successfully created your payment link ...` },
                    url: `${PAYMENT_URL_BASE}/${data[0]?.id}`,
                    attachments: [{
                        url: `${PAYMENT_URL_BASE}/${data[0]?.id}`,
                        title: `${content.title} payment link`,
                        description: `${content?.description || ""}`,
                        source: `Fourier`,
                        text: `${content?.description || ""}`,
                        id: `${data[0]?.id}`
                    }]
                })
                console.log("payment", data)
                console.log("user", newUser)
            } else {
                const code = generateUniqueCode();
                const { data: Newdata, error } = await supabase.from("payments").insert([{
                    title: content.title,
                    code: code,
                    payment_description: content?.description,
                    amount: Number(content.amount),
                    address: content.address,
                    details: content.details,
                    agent_id: state.agentId,
                    user_id: data[0]?.id,
                    token_types: ['USDC'],
                    chains: ['sui'],
                }]).select();

                if (error) {
                    console.error('Insert error:', error); // Debug log
                    throw error;
                }
                console.log('Insert successful:', Newdata); // Debug log
                callback({
                    text: `Successfully created your payment link is ${PAYMENT_URL_BASE}/${code}`,
                    content: { text: `Successfully created your payment link is ${PAYMENT_URL_BASE}/${code}` }
                })
            }
        } catch (error) {
            callback({
                text: "Unable to process Payment Link Generation.",
                content: { error: "Error in Payment Generation" }
            })
        }
        console.log("Generated content:", content);
        return true
    },
    validate: async (
        runtime: IAgentRuntime,
    ) => {
        console.log("Creating a Payment Link")
        return true
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Hey can you create a payment link for me "
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Yeah sure would you give the name ,description , amount ,address and token you for this payment."
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Can you explain why you need this details"
                }
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Yes , sure i would need the name: for the name of the payment you are creating , description: is the description of the payment, amount: this the amount to be paid to you by your users , address : this is the address you want to recieve the funds to , token : Token to used to recieve this payment",
                }
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Alright , help me create a payment link for my wedding contribution , i want everyone to pay 10USDC on to this my USDC address 0x62727dshsh7328"
                }
            },
            {
                user: "{{agent)}}",
                content: {
                    text: "I would create a payment link for you. please hold on a minute ..",
                    content: {
                        title: "Wedding Contribution",
                        description: "My Wedding Contribution",
                        amount: '1000',
                        token: "USDC",
                        address: "0x62727dshsh7328"
                    },
                    action: "CREATE_LINK"
                }
            }
        ],
    ],


}

