import type { Joke, Comment, User } from "@prisma/client";
import type {
  ActionFunction,
  LoaderFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Link,
  useLoaderData,
  useCatch,
  useParams,
  Form,
} from "@remix-run/react";
import { useRef } from "react";

import { db } from "~/util/db.server";
import {
  getUser,
  getUserId,
  requireUserId,
} from "~/util/session.server";

type LoaderData = { joke: Joke; comments: Array<Comment>,  user: User | null, isOwner: boolean };

export const loader: LoaderFunction = async ({
  request,
  params,
}) => {
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }

  const comments = await db.comment.findMany({
    where: {
      jokeId: params.jokeId
    }
  })
  
  const user = await getUser(request);
  const userId = await getUserId(request);


/*   const anonymousUser: User = {
    id: "Anonymous",
    createdAt: new Date(),
    updatedAt: new Date(),
    username: "Anonymous",
    passwordHash: "Anonymous"
  }

  const user = userDocument ? userDocument : anonymousUser */

  const data: LoaderData = {
    joke,
    comments,
    user, 
    isOwner: userId === joke.jokesterId,
  };
  return json(data);
};

export const action: ActionFunction = async ({
  request,
  params,
}) => {
  const form = await request.formData();
  if (form.get("_method") !== "delete" && form.get("_method") !== "addComment") {
    throw new Response(
      `The _method ${form.get("_method")} is not supported`,
      { status: 400 }
    );
  }

  const userId = await getUserId(request);

  switch(form.get("_method")) {
    case("delete") : 
    const joke = await db.joke.findUnique({
      where: { id: params.jokeId },
    });
    if (!joke) {
      throw new Response("Can't delete what does not exist", {
        status: 404,
      });
    }
    if (joke.jokesterId !== userId) {
      throw new Response(
        "Pssh, nice try. That's not your joke",
        {
          status: 401,
        }
      );
    }
    await db.joke.delete({ where: { id: params.jokeId } });
    return redirect("/jokes");

    case("addComment") : 
    const comment_content = form.get("comment");
    const username = form.get("username");

    const comment = {
      username : username,
      jokeId: params.jokeId!, 
      comment : comment_content, 
    }

    const commentDocument = await db.comment.create({
      data: {
        ...comment
      }
    })

    return commentDocument
  }

  return redirect(".")
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      {data.isOwner ? (
        <Form method="post">
          <input
            type="hidden"
            name="_method"
            value="delete"
          />
          <button type="submit" className="button">
            Delete
          </button>
        </Form>
      ) : null}

      <h3> Comments</h3>
      <div>
        {data.comments.length == 0 ? (
          <div className="commentBox">
            <p className="commentBody">
              There is no comments yet.
            </p>
          </div>
        ) : null}
        
        {data.comments.map((comment) => {
          return (
            <div key={comment.id} className="commentBox">
              <p className="commentTitle"> {comment.username} @ {new Date(comment.createdAt).toDateString()}</p>
              <p className="commentBody">
                {comment.comment}
              </p>
              </div>
          )
        })} 
      </div>
      {data.user ? (
      <Form method="post">
        <input 
        type="hidden"
        name="username"
        value={data.user.username} />

        <textarea
        placeholder="Add a comment"
        name="comment"/>

        <button type="submit" className="button" name="_method" value="addComment">
          Submit
        </button>
      </Form>
      ) : <div> You need to be logged in to comment </div>}
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 400: {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}