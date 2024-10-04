#include <stdlib.h>
#include <string.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include "radix_tree.h"
#include "rax/rax.h"


radix_tree* raxtree_new()
{
    return (radix_tree *)raxNew();
}

int raxtree_remove(radix_tree* t, rt_str_t *buf)
{
    if (t == NULL) {
        return -1;
    }

    if (buf == NULL || buf->buf == NULL) {
        return -2;
    }

    return raxRemove((rax *)t, buf->buf, buf->len, NULL);
}

int raxtree_destroy(radix_tree* t)
{
    if (t == NULL) {
        return 0;
    }

    raxFree(t);
    return 0;
}


int raxtree_insert(radix_tree* t, const rt_str_t *buf, int idx)
{
    void *data = (void *)(intptr_t)idx;

    if (t == NULL) {
        return -1;
    }

    if (buf == NULL || buf->buf == NULL) {
        return -2;
    }

    return raxInsert((rax *)t, buf->buf, buf->len, data, NULL);
}


void* raxtree_find(radix_tree* t, const rt_str_t *buf)
{
    if (t == NULL) {
        return NULL;
    }

    if (buf == NULL || buf->buf == NULL) {
        return NULL;
    }

    void *res = raxFind((rax *)t, buf->buf, buf->len);
    if (res == raxNotFound) {
        return NULL;
    }

    return res;
}


radix_iterator* raxtree_new_it(radix_tree* t)
{
    raxIterator *it = malloc(sizeof(raxIterator));
    if (it == NULL) {
        return NULL;
    }

    raxStart(it, (rax *)t);
    return (radix_iterator *)it;
}


void* raxtree_search(radix_tree* t, radix_iterator* it, const rt_str_t *buf)
{
    raxIterator *iter = (raxIterator *)it;
    if (it == NULL) {
        return NULL;
    }

    raxSeek(iter, "<=", buf->buf, buf->len);
    return (void *)iter;
}


int raxtree_next(radix_iterator* it, const rt_str_t *buf)
{
    raxIterator    *iter = it;

    int res = raxNext(iter);
    if (!res) {
        return -1;
    }

    if (iter->key_len > buf->len ||
        memcmp(buf->buf, iter->key, iter->key_len) != 0) {
        return -1;
    }

    return (int)(intptr_t)iter->data;
}


int raxtree_prev(radix_iterator* it, const rt_str_t *buf)
{
    raxIterator    *iter = it;
    int             res;

    while (1) {
        res = raxPrev(iter);
        if (!res) {
            return -1;
        }

        if (iter->key_len > buf->len ||
            memcmp(buf->buf, iter->key, iter->key_len) != 0) {
            continue;
        }

        break;
    }

    return (int)(intptr_t)iter->data;
}


int raxtree_up(radix_iterator* it, const rt_str_t *buf)
{
    raxIterator    *iter = it;
    int             res;

    while (1) {
        res = raxUp(iter);
        if (!res) {
            return -1;
        }

        if (iter->key_len > buf->len ||
            memcmp(buf->buf, iter->key, iter->key_len) != 0) {
            continue;
        }

        break;
    }

    return (int)(intptr_t)iter->data;
}


int raxtree_stop(radix_iterator* it)
{
    if (!it) {
        return 0;
    }

    raxStop(it);
    return 0;
}
