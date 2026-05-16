import db from '../database.js';

/**
 * RBAC helper — computes accessible offer IDs for a user based on
 * their assignments at any level (offer, module, topic).
 *
 * Rules:
 * - admin: access to everything
 * - coordinador: access where userId in assignedCoordinators at any level
 * - editor: access where userId in assignedEditors at any level
 */

/**
 * Get the set of offer IDs where the user has ANY assignment
 * (at offer, module, or topic level).
 */
export function getAccessibleOfferIds(userId, role) {
  if (role === 'admin') return null; // null means "all"

  const offerIds = new Set();

  // 1. Offers where user is directly assigned
  const offers = db.prepare('SELECT id, assigned_coordinators, assigned_editors, modules FROM offers').all();
  for (const offer of offers) {
    const coordinators = JSON.parse(offer.assigned_coordinators || '[]');
    const editors = JSON.parse(offer.assigned_editors || '[]');

    if (role === 'coordinador' && coordinators.includes(userId)) {
      offerIds.add(offer.id);
    }
    if (role === 'editor' && editors.includes(userId)) {
      offerIds.add(offer.id);
    }

    // 2. Modules where user is assigned (modules are JSON in offers)
    const modules = JSON.parse(offer.modules || '[]');
    for (const mod of modules) {
      const modCoords = mod.assignedCoordinators || [];
      const modEditors = mod.assignedEditors || [];
      if (role === 'coordinador' && modCoords.includes(userId)) {
        offerIds.add(offer.id);
      }
      if (role === 'editor' && modEditors.includes(userId)) {
        offerIds.add(offer.id);
      }
    }
  }

  // 3. Topics where user is assigned — get the offer_id from there
  const topics = db.prepare('SELECT offer_id, assigned_coordinators, assigned_editors FROM topics').all();
  for (const topic of topics) {
    const coordinators = JSON.parse(topic.assigned_coordinators || '[]');
    const editors = JSON.parse(topic.assigned_editors || '[]');

    if (role === 'coordinador' && coordinators.includes(userId)) {
      if (topic.offer_id) offerIds.add(topic.offer_id);
    }
    if (role === 'editor' && editors.includes(userId)) {
      if (topic.offer_id) offerIds.add(topic.offer_id);
    }
  }

  return offerIds;
}

/**
 * Check if a user has access to a specific offer at any level.
 */
export function hasOfferAccess(userId, role, offerId) {
  if (role === 'admin') return true;
  const ids = getAccessibleOfferIds(userId, role);
  return ids.has(offerId);
}

/**
 * Filter offers for a user. Returns full offer objects but with modules filtered.
 * - If assigned at offer level: sees offer + all module names (but modules filtered by assignment)
 * - If assigned at module level: sees offer name + only assigned modules
 * - If assigned at topic level: sees offer name + module name of assigned topic
 *
 * For admin: returns all offers unfiltered.
 */
export function filterOffersForUser(offers, topics, userId, role) {
  if (role === 'admin') return offers;

  const result = [];

  // Get topic-level assignments for this user
  const userTopics = topics.filter(t => {
    const coords = t.assigned_coordinators ? JSON.parse(t.assigned_coordinators) : [];
    const editors = t.assigned_editors ? JSON.parse(t.assigned_editors) : [];
    if (role === 'coordinador') return coords.includes(userId);
    if (role === 'editor') return editors.includes(userId);
    return false;
  });
  const userTopicModuleIds = new Set(userTopics.map(t => t.module_id));
  const userTopicOfferIds = new Set(userTopics.map(t => t.offer_id));

  for (const offer of offers) {
    const offerCoords = JSON.parse(offer.assigned_coordinators || '[]');
    const offerEditors = JSON.parse(offer.assigned_editors || '[]');
    const modules = JSON.parse(offer.modules || '[]');

    const isAssignedAtOffer = (role === 'coordinador' && offerCoords.includes(userId)) ||
                               (role === 'editor' && offerEditors.includes(userId));

    // Check module-level assignments
    const assignedModuleIds = new Set();
    for (const mod of modules) {
      const modCoords = mod.assignedCoordinators || [];
      const modEditors = mod.assignedEditors || [];
      if ((role === 'coordinador' && modCoords.includes(userId)) ||
          (role === 'editor' && modEditors.includes(userId))) {
        assignedModuleIds.add(mod.id);
      }
    }

    // Check if user has topic-level access in this offer
    const hasTopicInOffer = userTopicOfferIds.has(offer.id);
    const topicModuleIdsInOffer = new Set(
      userTopics.filter(t => t.offer_id === offer.id).map(t => t.module_id)
    );

    if (isAssignedAtOffer || assignedModuleIds.size > 0 || hasTopicInOffer) {
      // Filter modules: show modules where user has assignment at module or topic level
      const filteredModules = modules.map(mod => {
        const hasModuleAccess = isAssignedAtOffer || assignedModuleIds.has(mod.id) || topicModuleIdsInOffer.has(mod.id);
        if (!hasModuleAccess) return null;
        return mod;
      }).filter(Boolean);

      result.push({
        ...offer,
        modules: JSON.stringify(filteredModules),
      });
    }
  }

  return result;
}

/**
 * Filter topics for a user based on explicit assignment rules.
 * - admin: all topics
 * - coordinador: topics where userId in assignedCoordinators at topic level,
 *   OR topics in modules where assigned, OR topics in offers where assigned
 * - editor: same but with assignedEditors
 */
export function filterTopicsForUser(allTopics, allOffers, userId, role) {
  if (role === 'admin') return allTopics;

  // Build lookup of module/offer-level assignments
  const assignedOfferIds = new Set();
  const assignedModuleIds = new Set();

  for (const offer of allOffers) {
    const offerCoords = JSON.parse(offer.assigned_coordinators || '[]');
    const offerEditors = JSON.parse(offer.assigned_editors || '[]');

    if ((role === 'coordinador' && offerCoords.includes(userId)) ||
        (role === 'editor' && offerEditors.includes(userId))) {
      assignedOfferIds.add(offer.id);
    }

    const modules = JSON.parse(offer.modules || '[]');
    for (const mod of modules) {
      const modCoords = mod.assignedCoordinators || [];
      const modEditors = mod.assignedEditors || [];
      if ((role === 'coordinador' && modCoords.includes(userId)) ||
          (role === 'editor' && modEditors.includes(userId))) {
        assignedModuleIds.add(mod.id);
      }
    }
  }

  return allTopics.filter(topic => {
    // Check topic-level assignment
    const topicCoords = JSON.parse(topic.assigned_coordinators || '[]');
    const topicEditors = JSON.parse(topic.assigned_editors || '[]');

    if (role === 'coordinador' && topicCoords.includes(userId)) return true;
    if (role === 'editor' && topicEditors.includes(userId)) return true;

    // Check module-level assignment
    if (topic.module_id && assignedModuleIds.has(topic.module_id)) return true;

    // Check offer-level assignment
    if (topic.offer_id && assignedOfferIds.has(topic.offer_id)) return true;

    return false;
  });
}
