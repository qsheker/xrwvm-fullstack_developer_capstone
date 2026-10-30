# Best Cars interface decisions

The primary job is to find a US dealership and read or add a review. The directory uses the 50 dealers from IBM's supplied dataset, including ID, name, state, city, address and ZIP. Counts come from the filtered dataset. A complete review includes the authenticated author, text, purchase information and service-derived sentiment. No sales, ratings or performance statistics are invented.

The design-taste-frontend draw selected Achromatic ledger (seed 1390871133). Its neutral surfaces, modest typography and quiet controls support a directory people scan. The original project's Arial family is retained. The face is a light showroom-grey ground and a compact BC wheel-like wordmark. State filtering is the signature interaction.

The shell is adapted to the course's required top navigation, which has only three destinations. No sidebar is necessary. The detail layout uses Bootstrap card markup for actual reviews; the dealt dashboard chart composition is omitted because the data has no metrics or time series.

Screen questions:
- Directory: which dealership can I visit in this state?
- Detail: what have customers said about this dealership?
- Review: what was my experience and what vehicle did I buy?
- Login and registration: how do I establish a session to post?
- About and Contact: who runs the fictional dealership and how can I contact them?

All directory/review fixtures come from the starter's data directory. Team names, biographies, .example email addresses, phone and office are fictional educational content. The triptych team image is AI generated using the built-in image_gen tool. Prompt: one wide photographic triptych of three fictional dealership team members (Maya Chen, Daniel Brooks and Sofia Rivera), consistent chest-up portraits against a softly lit showroom, with no logos or text.
