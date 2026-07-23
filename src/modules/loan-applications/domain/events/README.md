# domain/events

Domain events raised by the `loan-applications` module when something business-significant happens.

Other modules (e.g. `activity-timeline`) react to these by being called explicitly from `application/use-cases`, not through hidden framework magic.

**Never put here**: event *handlers*/subscribers — only the event definitions themselves.
