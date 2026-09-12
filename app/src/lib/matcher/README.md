# Matcher

How Onramp turns "what are you trying to do" into a surface, without a network call.
Every use case carries a title, a few tags and a longer list of intent words and
synonyms. These are indexed once per catalogue, with the title weighted most heavily,
tags next, and the intent list a little behind that, so a close title match beats a
loose keyword hit further down the list.
Typed text is cleaned up first: lower-cased, punctuation removed, American and
British spellings folded together, plurals and "-ing" endings smoothed off. Guide-me
answers skip the free text entirely and go through a fixed table that turns each
chosen option into a small set of search words.
Whichever way the query arrives, the search returns a shortlist of the closest use
cases, best first. Each already recommends a surface and, more weakly, an
alternative; the shortlist's surfaces are added up, and the surface with the highest
total wins. How much it beats the runner-up by decides whether the answer is settled
or worth a clarifying question. A shortlist of one, or none at all, is its own case.
Route assembly then follows the winning use case: its setup steps, prompt,
capabilities and connectors, plus any "what's new" feature recently shipped there.
