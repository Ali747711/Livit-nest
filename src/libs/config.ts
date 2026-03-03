import { ObjectId } from 'bson';
import { P } from './types/common';
import { v4 as uuid4 } from 'uuid';
import * as path from 'path';
export const shapeIntoMongoObjectId = (target: any) => {
  return typeof target === 'string' ? new ObjectId(target) : target;
};

export const availableAgentSorts = [
  'createdAt',
  'updatedAt',
  'memberLikes',
  'memberViews',
  'memberRank',
  'memberProperties',
];

export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];

export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];

export const availableOptions = ['propertyBarter', 'propertyRent'];
export const availableProperties = [
  'createdAt',
  'updatedAt',
  'propertyLikes',
  'propertyViews',
  'propertyRank',
  'propertyPrice',
];

export const availableArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availableCommentSorts = ['createdAt', 'updatedAt'];

// IMAGE CONFIGS
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const genFilenameForImage = (filename: any) => {
  const ext = path.parse(filename).ext;
  return uuid4() + ext;
};

// LOOK-UPS =======================

export const lookupMember = {
  $lookup: {
    from: 'members',
    localField: 'memberId',
    foreignField: '_id',
    as: 'memberData',
  },
};

export const lookupVisit = {
  $lookup: {
    from: 'members',
    localField: 'visitedProperty.memberId',
    foreignField: '_id',
    as: 'visitedProperty.memberData',
  },
};
export const lookupFavorite = {
  $lookup: {
    from: 'members',
    localField: 'favoriteProperty.memberId',
    foreignField: '_id',
    as: 'favoriteProperty.memberData',
  },
};

export const lookupAuthMemberLiked = (memberId: P, targetRefId: string = '$_id') => {
  return {
    $lookup: {
      from: 'likes',
      let: {
        localMemberId: memberId,
        localLikeRefId: targetRefId,
        localMyFavorite: true,
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ['$likeRefId', '$$localLikeRefId'] }, { $eq: ['$memberId', '$$localMemberId'] }],
            },
          },
        },
        {
          $project: {
            _id: 0,
            memberId: 1,
            likeRefId: 1,
            myFavorite: '$$localMyFavorite',
          },
        },
      ],
      as: 'meLiked',
    },
  };
};

interface LookupAuthMemberFollowed {
  followerId: P;
  followingId: string;
}
export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
  const { followerId, followingId } = input;
  return {
    $lookup: {
      from: 'follows',
      let: {
        localFollowerId: followerId,
        localFollowingId: followingId,
        localMyFollowing: true,
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ['$followerId', '$$localFollowerId'] }, { $eq: ['$followingId', '$$localFollowingId'] }],
            },
          },
        },
        {
          $project: {
            _id: 0,
            followerId: 1,
            followingId: 1,
            myFollowing: '$$localMyFollowing',
          },
        },
      ],
      as: 'meFollowed',
    },
  };
};
