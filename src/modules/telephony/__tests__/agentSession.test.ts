import { beforeEach, describe, expect, it } from "vitest";
import { makeStartAgentSession } from "../application/use-cases/startAgentSession";
import { makeChangeAgentSessionStatus } from "../application/use-cases/changeAgentSessionStatus";
import { makeEndAgentSession } from "../application/use-cases/endAgentSession";
import { makeGetActiveAgentSession } from "../application/use-cases/getAgentSession";
import {
  AgentSessionAlreadyActiveError,
  AgentSessionAlreadyEndedError,
  InvalidAgentReferenceError,
} from "../domain/errors/TelephonyErrors";
import { FakeAgentSessionRepository, FakeExtensionRepository } from "./fakeTelephonyRepositories";
import { FakeUserLookupPort } from "./fakeLookupPorts";

const ORG_ID = "00000000-0000-0000-0001-000000000000";
const USER_ID = "user-1";

describe("Agent Session", () => {
  let repository: FakeAgentSessionRepository;
  let extensionRepository: FakeExtensionRepository;
  let userLookup: FakeUserLookupPort;
  let startAgentSession: ReturnType<typeof makeStartAgentSession>;
  let changeAgentSessionStatus: ReturnType<typeof makeChangeAgentSessionStatus>;
  let endAgentSession: ReturnType<typeof makeEndAgentSession>;
  let getActiveAgentSession: ReturnType<typeof makeGetActiveAgentSession>;

  beforeEach(() => {
    repository = new FakeAgentSessionRepository();
    extensionRepository = new FakeExtensionRepository();
    userLookup = new FakeUserLookupPort();
    userLookup.users.set(USER_ID, {
      id: USER_ID,
      organizationId: ORG_ID,
      status: "ACTIVE",
      fullName: "Agent Smith",
    });

    startAgentSession = makeStartAgentSession(repository, extensionRepository, userLookup);
    changeAgentSessionStatus = makeChangeAgentSessionStatus(repository);
    endAgentSession = makeEndAgentSession(repository);
    getActiveAgentSession = makeGetActiveAgentSession(repository);
  });

  it("logs an Agent in, auto-provisioning an Extension, with status LOGGED_IN", async () => {
    const session = await startAgentSession({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {},
      actor: { actorType: "USER", actorId: USER_ID },
    });

    expect(session.status).toBe("LOGGED_IN");
    expect(session.userId).toBe(USER_ID);
    const extension = await extensionRepository.findByUserId(USER_ID);
    expect(extension).not.toBeNull();
  });

  it("rejects a second Login while a session is already Active", async () => {
    await startAgentSession({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {},
      actor: { actorType: "USER", actorId: USER_ID },
    });

    await expect(
      startAgentSession({
        organizationId: ORG_ID,
        userId: USER_ID,
        input: {},
        actor: { actorType: "USER", actorId: USER_ID },
      }),
    ).rejects.toBeInstanceOf(AgentSessionAlreadyActiveError);
  });

  it("rejects Login for a non-existent or inactive User", async () => {
    await expect(
      startAgentSession({
        organizationId: ORG_ID,
        userId: "does-not-exist",
        input: {},
        actor: { actorType: "USER", actorId: "does-not-exist" },
      }),
    ).rejects.toBeInstanceOf(InvalidAgentReferenceError);
  });

  it("changes availability status and appends an Agent Status History entry", async () => {
    const session = await startAgentSession({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {},
      actor: { actorType: "USER", actorId: USER_ID },
    });

    const updated = await changeAgentSessionStatus({
      id: session.id,
      input: { status: "AVAILABLE" },
      actor: { actorType: "USER", actorId: USER_ID },
    });

    expect(updated.status).toBe("AVAILABLE");
    const history = await repository.listStatusHistory(session.id);
    expect(history).toHaveLength(2);
    expect(history.map((entry) => entry.status)).toEqual(["LOGGED_IN", "AVAILABLE"]);
  });

  it("logs an Agent out, ending the session permanently", async () => {
    const session = await startAgentSession({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {},
      actor: { actorType: "USER", actorId: USER_ID },
    });

    const ended = await endAgentSession({
      id: session.id,
      actor: { actorType: "USER", actorId: USER_ID },
    });

    expect(ended.status).toBe("LOGGED_OUT");
    expect(ended.logoutAt).not.toBeNull();
    expect(await getActiveAgentSession(USER_ID)).toBeNull();
  });

  it("rejects changing status on an already-ended session", async () => {
    const session = await startAgentSession({
      organizationId: ORG_ID,
      userId: USER_ID,
      input: {},
      actor: { actorType: "USER", actorId: USER_ID },
    });
    await endAgentSession({ id: session.id, actor: { actorType: "USER", actorId: USER_ID } });

    await expect(
      changeAgentSessionStatus({
        id: session.id,
        input: { status: "AVAILABLE" },
        actor: { actorType: "USER", actorId: USER_ID },
      }),
    ).rejects.toBeInstanceOf(AgentSessionAlreadyEndedError);
  });
});
