import type { User } from "@prisma/client";
import type { ActionFunction, LoaderFunction} from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { db } from "~/util/db.server"
import { register } from "~/util/session.server";


type LoaderData = { users: Array<User> };

export const loader: LoaderFunction = async () => {
    const users = await db.user.findMany();

    const data = { users }
    return json(data)
}

export const action: ActionFunction = async ({ request }) => {
    const form = await request.formData();
    const username = form.get("username");
    const password = form.get("password");

    if (
        typeof username !== "string" ||
        typeof password !== "string"  ) {
        return json({}, { status: 404 });
    }

    const user = await register({ username, password });
    return null
}


export default function userIndex() {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const data = useLoaderData<LoaderData>()

    return (
        <div>
            <h1> Hello Users </h1>
            {data.users.map((user) =>
            (<li key={user.id}>
                {user.username}
            </li>))}

            <hr />
            
            <h1> Add new user</h1>

            <Form method="post">
                <input type="text" name="username" placeholder="Add a username" />
                <input type="password" name="password" placeholder="password" />
                <button type="submit" className="button"> Submit </button>
            </Form>
        </div>
    )
}