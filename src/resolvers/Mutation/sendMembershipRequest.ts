import {
  MEMBERSHIP_REQUEST_NOT_FOUND_ERROR,
  ORGANIZATION_NOT_FOUND_ERROR,
  USER_NOT_FOUND_ERROR,
} from "../../constants";
import type { MutationResolvers } from "../../types/generatedGraphQLTypes";
import { errors, requestContext } from "../../libraries";
import { User, MembershipRequest, Organization } from "../../models";
/**
 * This function enables to send membership request.
 * @param _parent - parent of current request
 * @param args - payload provided with the request
 * @param context - context of entire application
 * @remarks The following checks are done:
 * 1. If the user exists.
 * 2. If the organization exists
 * 3. If the membership request already exists.
 * @returns Membership request.
 */
export const sendMembershipRequest: MutationResolvers["sendMembershipRequest"] =
  async (_parent, args, context) => {
    const currentUserExists = await User.exists({
      _id: context.userId,
    });

    if (currentUserExists === false) {
      throw new errors.NotFoundError(
        requestContext.translate(USER_NOT_FOUND_ERROR.MESSAGE),
        USER_NOT_FOUND_ERROR.CODE,
        USER_NOT_FOUND_ERROR.PARAM
      );
    }

    const organization = await Organization.findOne({
      _id: args.organizationId,
    }).lean();

    if (!organization) {
      throw new errors.NotFoundError(
        requestContext.translate(ORGANIZATION_NOT_FOUND_ERROR.MESSAGE),
        ORGANIZATION_NOT_FOUND_ERROR.CODE,
        ORGANIZATION_NOT_FOUND_ERROR.PARAM
      );
    }

    const membershipRequestExists = await MembershipRequest.exists({
      user: context.userId,
      organization: organization._id,
    });

    if (membershipRequestExists === true) {
      throw new errors.ConflictError(
        requestContext.translate(MEMBERSHIP_REQUEST_NOT_FOUND_ERROR.MESSAGE),
        MEMBERSHIP_REQUEST_NOT_FOUND_ERROR.CODE,
        MEMBERSHIP_REQUEST_NOT_FOUND_ERROR.PARAM
      );
    }

    const createdMembershipRequest = await MembershipRequest.create({
      user: context.userId,
      organization: organization._id,
    });

    // add membership request to organization
    await Organization.updateOne(
      {
        _id: organization._id,
      },
      {
        $push: {
          membershipRequests: createdMembershipRequest._id,
        },
      }
    );

    // add membership request to user
    await User.updateOne(
      {
        _id: context.userId,
      },
      {
        $push: {
          membershipRequests: createdMembershipRequest._id,
        },
      }
    );

    return createdMembershipRequest.toObject();
  };
